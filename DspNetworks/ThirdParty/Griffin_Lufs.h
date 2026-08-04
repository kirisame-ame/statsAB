//----------------------------------------------
// Griffin_Lufs.h
// Calculate LUFS of audio input and output as a modulation value in dB.
//----------------------------------------------

#pragma once
#include <JuceHeader.h>
#include <atomic>
#include <cmath>
#include <limits>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

namespace project {
using namespace juce;
using namespace hise;
using namespace scriptnode;

template <int NV> struct Griffin_Lufs : public data::base {
  SNEX_NODE(Griffin_Lufs);

  struct MetadataClass {
    SN_NODE_ID("Griffin_Lufs");
  };

  // Node properties
  static constexpr bool isModNode() { return true; }
  static constexpr bool isPolyphonic() { return NV > 1; }
  static constexpr bool hasTail() { return false; }
  static constexpr bool isSuspendedOnSilence() { return false; }
  static constexpr int getFixChannelAmount() { return 2; }

  static constexpr int NumTables = 0;
  static constexpr int NumSliderPacks = 0;
  static constexpr int NumAudioFiles = 0;
  static constexpr int NumFilters = 0;
  static constexpr int NumDisplayBuffers = 0;

  // Constants
  static constexpr float SILENCE_LUFS = -160.0f; // dB for silence
  static constexpr float MIN_LUFS = -100.0f;
  static constexpr float MAX_LUFS = 0.0f;

  // Internal parameters
  float sampleRate = 44100.0f;
  float blockSize = 512.0f;
  float lufsBlockSize = 400.0f; // LUFS window in milliseconds
  float overlap = 0.75f;        // 75% overlap

  // Ring buffer for squared samples
  AudioBuffer<float> filteredRingBuffer;
  size_t ringBufferWritePos = 0;
  size_t ringBufferSize = 0;
  size_t hopSize = 0;
  double runningSum = 0.0;

  // Pre- and weighting filters
  std::array<IIRFilter, 2> preFilters;
  std::array<IIRFilter, 2> weightingFilters;

  // LUFS result (before +2.96 K-weighting offset)
  float currentLUFS = SILENCE_LUFS;

  // Scratch buffer for filtering each block
  AudioBuffer<float> filteredBuffer;

  // Modulation output
  ModValue modValue;

  // Thread safety for parameter updates
  std::atomic<bool> parametersChanged{false};
  CriticalSection processLock;

  void publishLUFS(float db) {
    const float clampedDb = jlimit(MIN_LUFS, MAX_LUFS, db);

    currentLUFS = clampedDb;

    const float normalized = (clampedDb - MIN_LUFS) / (MAX_LUFS - MIN_LUFS);

    modValue.setModValue(normalized);
  }
  // Prepare: called before processing begins
  void prepare(PrepareSpecs specs) {
    ScopedLock sl(processLock);
    sampleRate = static_cast<float>(specs.sampleRate);
    blockSize = static_cast<float>(specs.blockSize);
    updateInternalState();
  }

  // Update buffer sizes and filter coefficients when parameters change
  void updateInternalState() {
    // Clamp parameters
    lufsBlockSize = jlimit(100.0f, 4000.0f, lufsBlockSize); // 100 ms to 4000 ms
    overlap = jlimit(0.0001f, 0.9999f, overlap);            // 0.01% to 99.99%

    // Calculate ring buffer size (samples) and hop size
    ringBufferSize = static_cast<size_t>(sampleRate * lufsBlockSize / 1000.0f);
    jassert(ringBufferSize > 0 && "ringBufferSize must be greater than 0");

    hopSize = std::max(static_cast<size_t>(1),
                       static_cast<size_t>(ringBufferSize * (1.0f - overlap)));

    // Allocate or resize buffers
    filteredRingBuffer.setSize(2, static_cast<int>(ringBufferSize));
    filteredRingBuffer.clear();
    ringBufferWritePos = 0;
    runningSum = 0.0;

    filteredBuffer.setSize(2, static_cast<int>(blockSize));

    // Recompute filter coefficients
    calculateFilterCoefficients();

    // Reset state
    reset();
  }

  // Compute IIR filter coefficients for LUFS pre- and weighting filters
  void calculateFilterCoefficients() {
    const double epsilon = 1e-12;

    // Pre-filter (K-weighting) design
    const double db = 3.999843853973347;
    const double f0 = 1681.974450955533;
    const double Q = 0.7071752369554196;
    const double K = std::tan(M_PI * f0 / sampleRate);

    const double Vh = std::pow(10.0, db / 20.0);
    const double Vb = std::pow(Vh, 0.4996667741545416);

    const double denom0 = 1.0 + K / Q + K * K + epsilon;
    const double denom1 = 2.0 * (K * K - 1.0) / denom0;
    const double denom2 = (1.0 - K / Q + K * K) / denom0;
    const double num0 = (Vh + Vb * K / Q + K * K) / denom0;
    const double num1 = 2.0 * (K * K - Vh) / denom0;
    const double num2 = (Vh - Vb * K / Q + K * K) / denom0;

    jassert(!std::isnan(num0) && !std::isinf(num0));
    jassert(!std::isnan(num1) && !std::isinf(num1));
    jassert(!std::isnan(num2) && !std::isinf(num2));
    jassert(!std::isnan(denom1) && !std::isinf(denom1));
    jassert(!std::isnan(denom2) && !std::isinf(denom2));

    IIRCoefficients preCoeffs(num0, num1, num2, 1.0, denom1, denom2);

    // Weighting filter design
    const double f0_w = 38.13547087602444;
    const double Q_w = 0.5003270373238773;
    const double K_w = std::tan(M_PI * f0_w / sampleRate);

    const double denom0_w = 1.0 + K_w / Q_w + K_w * K_w + epsilon;
    const double denom1_w = 2.0 * (K_w * K_w - 1.0) / denom0_w;
    const double denom2_w = (1.0 - K_w / Q_w + K_w * K_w) / denom0_w;

    jassert(!std::isnan(denom0_w) && !std::isinf(denom0_w));
    jassert(!std::isnan(denom1_w) && !std::isinf(denom1_w));
    jassert(!std::isnan(denom2_w) && !std::isinf(denom2_w));

    IIRCoefficients weightingCoeffs(1.0, -2.0, 1.0, 1.0, denom1_w, denom2_w);

    for (int ch = 0; ch < 2; ++ch) {
      preFilters[ch].setCoefficients(preCoeffs);
      weightingFilters[ch].setCoefficients(weightingCoeffs);
    }
  }

  // Main processing
  template <typename ProcessDataType> void process(ProcessDataType &data) {
    auto &fixData = data.template as<ProcessData<2>>();
    int numSamples = fixData.getNumSamples();
    if (numSamples == 0)
      return;

    if (parametersChanged.exchange(false)) {
      ScopedLock sl(processLock);
      updateInternalState();
    }

    ScopedLock sl(processLock);

    // Ensure buffer sizes
    if (filteredBuffer.getNumSamples() < numSamples)
      filteredBuffer.setSize(2, numSamples);

    // Copy and filter input into filteredBuffer
    auto inputBlock = fixData.toAudioBlock();
    AudioBuffer<float> tempBuffer(filteredBuffer);
    auto filteredBlock = dsp::AudioBlock<float>(tempBuffer);

    for (int ch = 0; ch < 2; ++ch) {
      FloatVectorOperations::copy(filteredBlock.getChannelPointer(ch),
                                  inputBlock.getChannelPointer(ch), numSamples);

      preFilters[ch].processSamples(filteredBlock.getChannelPointer(ch),
                                    numSamples);
      weightingFilters[ch].processSamples(filteredBlock.getChannelPointer(ch),
                                          numSamples);
    }

    // Accumulate squared samples into ring buffer and compute LUFS per hop
    for (int i = 0; i < numSamples; ++i) {
      float inL = filteredBlock.getSample(0, i);
      float inR = filteredBlock.getSample(1, i);

      // Subtract oldest samples
      float oldL =
          filteredRingBuffer.getSample(0, static_cast<int>(ringBufferWritePos));
      float oldR =
          filteredRingBuffer.getSample(1, static_cast<int>(ringBufferWritePos));
      runningSum -= (oldL * oldL + oldR * oldR);

      // Add new samples
      runningSum += (inL * inL + inR * inR);

      // Write into ring buffer
      filteredRingBuffer.setSample(0, static_cast<int>(ringBufferWritePos),
                                   inL);
      filteredRingBuffer.setSample(1, static_cast<int>(ringBufferWritePos),
                                   inR);
      ringBufferWritePos = (ringBufferWritePos + 1) % ringBufferSize;

      // Calculate LUFS on hop boundaries
      if (hopSize == 0 || (ringBufferWritePos % hopSize) == 0) {
        calculateLUFS();
      }
    }
  }

  // Compute LUFS from runningSum and update modulation output
  void calculateLUFS() {
    jassert(ringBufferSize > 0 && "ringBufferSize must be greater than 0");

    double meanSquared = runningSum / (2.0 * ringBufferSize);

    if (meanSquared > 1e-12) {
      // Standard LUFS: -0.691 + 10 * log10(meanSquared)
      const float weightedLUFS =
          static_cast<float>(-0.691 + 10.0 * std::log10(meanSquared) + 2.96);

      publishLUFS(weightedLUFS);
    } else {
      // Silence case: set to -160 dB
      currentLUFS = SILENCE_LUFS;
      publishLUFS(SILENCE_LUFS);
    }
  }

  // Reset internal state and filters
  void reset() {
    ScopedLock sl(processLock);
    ringBufferWritePos = 0;
    runningSum = 0.0;
    filteredRingBuffer.clear();

    for (int ch = 0; ch < 2; ++ch) {
      preFilters[ch].reset();
      weightingFilters[ch].reset();
    }

    currentLUFS = SILENCE_LUFS;
    publishLUFS(SILENCE_LUFS);
  }

  // Provide updated modulation output
  int handleModulation(double &value) {
    return modValue.getChangedValue(value);
  }

  void handleHiseEvent(HiseEvent &) {}

  template <typename T> void processFrame(T &) {}

  // Update parameters at runtime: P==0 => block size, P==1 => overlap
  template <int P> void setParameter(double v) {
    if (P == 0) {
      lufsBlockSize = static_cast<float>(v);
      parametersChanged.store(true);
    } else if (P == 1) {
      overlap = static_cast<float>(v);
      parametersChanged.store(true);
    }
    reset();
  }

  // Create GUI parameters
  void createParameters(ParameterDataList &data) {
    {
      parameter::data p("LUFS Window (ms)", {100.0, 4000.0});
      registerCallback<0>(p);
      p.setDefaultValue(400.0f);
      data.add(std::move(p));
    }
    {
      parameter::data p("Overlap", {0.0001, 0.9999});
      registerCallback<1>(p);
      p.setDefaultValue(0.75f);
      data.add(std::move(p));
    }
  }
};
} // namespace project
