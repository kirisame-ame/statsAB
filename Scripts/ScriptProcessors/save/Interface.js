Content.makeFrontInterface(1200, 1000);
const var spectrumSource =
    Synth.getDisplayBufferSource("SpectrumFX");
const var spectrumSource2 =
    Synth.getDisplayBufferSource("SpectrumFX2");
    
const var spectrumBuffer =
    spectrumSource.getDisplayBuffer(0);
const var spectrumBuffer2 =
    spectrumSource2.getDisplayBuffer(0);    
spectrumBuffer.setRingBufferProperties({
    "BufferLength": 16384,
    "WindowType": "Blackman Harris",
    "DecibelRange": [-100.0, 0.0],
    "UsePeakDecay": false,
    "UseDecibelScale": true,
    "YGamma": 1.0,
    "Decay": 0.7,
    "UseLogarithmicFreqAxis": true
});
spectrumBuffer2.setRingBufferProperties({
    "BufferLength": 16384,
    "WindowType": "Blackman Harris",
    "DecibelRange": [-100.0, 0.0],
    "UsePeakDecay": false,
    "UseDecibelScale": true,
    "YGamma": 1.0,
    "Decay": 0.7,
    "UseLogarithmicFreqAxis": true
});
const var SpectrumPanel = Content.getComponent("SpectrumPanel");
const var SpectrumPanel2 = Content.getComponent("SpectrumPanel2");
const var spectrumReadBuffer = Buffer.create(16384);
const var spectrumReadBuffer2 = Buffer.create(16384);
SpectrumPanel.data.path = Content.createPath();
SpectrumPanel2.data.path = Content.createPath();
const var spectrumFrequencies = [
      20, 50, 100, 200, 500,
      1000, 2000, 5000, 10000, 20000
  ];

  const var spectrumFrequencyLabels = [
      "20", "50", "100", "200", "500",
      "1k", "2k", "5k", "10k", "20k"
  ];

  const var spectrumDbLevels = [
      0, -20, -40, -60, -80
  ];
 SpectrumPanel.setPaintRoutine(function(g)
  {
      // Reserve space on the left and bottom for labels.
      var area = [
          38,
          8,
          this.getWidth() - 46,
          this.getHeight() - 30
      ];

      var i;
      var x;
      var y;
      var normalized;

      g.fillAll(0xFF101216);
      g.setFont("Oxygen", 11.0);

      // Horizontal dB lines and labels.
      for (i = 0; i < spectrumDbLevels.length; i++)
      {
          normalized = (spectrumDbLevels[i] + 100.0) / 100.0;
          y = area[1] + area[3] * (1.0 - normalized);

          g.setColour(0x283F4652);
          g.drawHorizontalLine(
              Math.round(y),
              area[0],
              area[0] + area[2]
          );

          g.setColour(0xFF9299A6);
          g.drawAlignedText(
              spectrumDbLevels[i] + "",
              [2, y - 7, 31, 14],
              "right"
          );
      }

      // Vertical logarithmic frequency lines and labels.
      for (i = 0; i < spectrumFrequencies.length; i++)
      {
          normalized =
              Math.log(spectrumFrequencies[i] / 20.0) /
              Math.log(20000.0 / 20.0);

          x = area[0] + normalized * area[2];

          g.setColour(0x283F4652);
          g.drawVerticalLine(
              Math.round(x),
              area[1],
              area[1] + area[3]
          );

          g.setColour(0xFF9299A6);
          g.drawAlignedText(
              spectrumFrequencyLabels[i],
              [x - 17, area[1] + area[3] + 4, 34, 14],
              "centred"
          );
      }

      // Border around the plotting region.
      g.setColour(0x553F4652);
      g.drawRect(area, 1.0);

      // FFT curve.
      g.setColour(0xFF55C8FF);
      g.drawPath(this.data.path, area, {
          "Thickness": 2.0,
          "JointStyle": "curved",
          "EndCapStyle": "rounded"
      });
  });
  SpectrumPanel.setTimerCallback(function()
  {
      var area = [
          38,
          8,
          this.getWidth() - 46,
          this.getHeight() - 30
      ];

      var path = this.data.path;
      var sampleRate = Engine.getSampleRate();
      var numBins = spectrumReadBuffer.length;
      var numPoints = Math.floor(area[2]);

      var i;
      var normalizedX;
      var normalizedY;
      var frequency;
      var bin;
      var db;
      var x;
      var y;
      
      var binPosition;
       var lowerBin;
       var upperBin;
       var binFraction;
       var lowerGain;
       var upperGain;

      // Obtain a thread-safe copy before reading FFT values.
      spectrumBuffer.copyReadBuffer(spectrumReadBuffer);

      path.clear();

      /*
          Invisible anchor points establish the complete path bounds.
          Consecutive startNewSubPath() calls do not draw connecting lines.
      */
      path.startNewSubPath(area[0], area[1]);
      path.startNewSubPath(
          area[0] + area[2],
          area[1] + area[3]
      );

      for (i = 0; i < numPoints; i++)
      {
          normalizedX = i / (numPoints - 1.0);

          // Logarithmic mapping from 20 Hz to 20 kHz.
          frequency = 20.0 * Math.pow(1000.0, normalizedX);

          /*
              FFT bins are linear in frequency. The buffer represents
              frequencies from 0 Hz toward the engine sample rate.
          */
          binPosition =
      frequency / sampleRate * (numBins - 1);

  lowerBin = Math.floor(binPosition);
  upperBin = Math.min(lowerBin + 1, numBins - 1);
  binFraction = binPosition - lowerBin;

  lowerGain = spectrumReadBuffer[lowerBin];
  upperGain = spectrumReadBuffer[upperBin];

  var gain = lowerGain +
         (upperGain - lowerGain) * binFraction;

  gain = Math.max(gain, 0.0000001);

  db = Math.range(
      Engine.getDecibelsForGainFactor(gain),
      -100.0,
      0.0
  );

          normalizedY = (db + 100.0) / 100.0;

          x = area[0] + normalizedX * area[2];
          y = area[1] + (1.0 - normalizedY) * area[3];

          if (i == 0)
              path.startNewSubPath(x, y);
          else
              path.lineTo(x, y);
      }

      this.repaint();
  });

  SpectrumPanel.startTimer(33);
spectrumBuffer.setActive(true);


SpectrumPanel2.setPaintRoutine(function(g)
  {
      // Reserve space on the left and bottom for labels.
      var area = [
          38,
          8,
          this.getWidth() - 46,
          this.getHeight() - 30
      ];

      var i;
      var x;
      var y;
      var normalized;

      g.fillAll(0xFF101216);
      g.setFont("Oxygen", 11.0);

      // Horizontal dB lines and labels.
      for (i = 0; i < spectrumDbLevels.length; i++)
      {
          normalized = (spectrumDbLevels[i] + 100.0) / 100.0;
          y = area[1] + area[3] * (1.0 - normalized);

          g.setColour(0x283F4652);
          g.drawHorizontalLine(
              Math.round(y),
              area[0],
              area[0] + area[2]
          );

          g.setColour(0xFF9299A6);
          g.drawAlignedText(
              spectrumDbLevels[i] + "",
              [2, y - 7, 31, 14],
              "right"
          );
      }

      // Vertical logarithmic frequency lines and labels.
      for (i = 0; i < spectrumFrequencies.length; i++)
      {
          normalized =
              Math.log(spectrumFrequencies[i] / 20.0) /
              Math.log(20000.0 / 20.0);

          x = area[0] + normalized * area[2];

          g.setColour(0x283F4652);
          g.drawVerticalLine(
              Math.round(x),
              area[1],
              area[1] + area[3]
          );

          g.setColour(0xFF9299A6);
          g.drawAlignedText(
              spectrumFrequencyLabels[i],
              [x - 17, area[1] + area[3] + 4, 34, 14],
              "centred"
          );
      }

      // Border around the plotting region.
      g.setColour(0x553F4652);
      g.drawRect(area, 1.0);

      // FFT curve.
      g.setColour(Colours.fromVec4([1,0,0,1]));
      g.drawPath(this.data.path, area, {
          "Thickness": 2.0,
          "JointStyle": "curved",
          "EndCapStyle": "rounded"
      });
  });
  SpectrumPanel2.setTimerCallback(function()
  {
      var area = [
          38,
          8,
          this.getWidth() - 46,
          this.getHeight() - 30
      ];

      var path = this.data.path;
      var sampleRate = Engine.getSampleRate();
      var numBins = spectrumReadBuffer2.length;
      var numPoints = Math.floor(area[2]);

      var i;
      var normalizedX;
      var normalizedY;
      var frequency;
      var bin;
      var db;
      var x;
      var y;
      
      var binPosition;
       var lowerBin;
       var upperBin;
       var binFraction;
       var lowerGain;
       var upperGain;

      // Obtain a thread-safe copy before reading FFT values.
      spectrumBuffer2.copyReadBuffer(spectrumReadBuffer2);

      path.clear();

      /*
          Invisible anchor points establish the complete path bounds.
          Consecutive startNewSubPath() calls do not draw connecting lines.
      */
      path.startNewSubPath(area[0], area[1]);
      path.startNewSubPath(
          area[0] + area[2],
          area[1] + area[3]
      );

      for (i = 0; i < numPoints; i++)
      {
          normalizedX = i / (numPoints - 1.0);

          // Logarithmic mapping from 20 Hz to 20 kHz.
          frequency = 20.0 * Math.pow(1000.0, normalizedX);

          /*
              FFT bins are linear in frequency. The buffer represents
              frequencies from 0 Hz toward the engine sample rate.
          */
          binPosition =
      frequency / sampleRate * (numBins - 1);

  lowerBin = Math.floor(binPosition);
  upperBin = Math.min(lowerBin + 1, numBins - 1);
  binFraction = binPosition - lowerBin;

  lowerGain = spectrumReadBuffer2[lowerBin];
  upperGain = spectrumReadBuffer2[upperBin];

  var gain = lowerGain +
         (upperGain - lowerGain) * binFraction;

  gain = Math.max(gain, 0.0000001);

  db = Math.range(
      Engine.getDecibelsForGainFactor(gain),
      -100.0,
      0.0
  );

          normalizedY = (db + 100.0) / 100.0;

          x = area[0] + normalizedX * area[2];
          y = area[1] + (1.0 - normalizedY) * area[3];

          if (i == 0)
              path.startNewSubPath(x, y);
          else
              path.lineTo(x, y);
      }

      this.repaint();
  });

  SpectrumPanel2.startTimer(33);
spectrumBuffer2.setActive(true);
function onNoteOn()
{
	
}
 function onNoteOff()
{
	
}
 function onController()
{
	
}
 function onTimer()
{
	
}
 function onControl(number, value)
{
	
}
 