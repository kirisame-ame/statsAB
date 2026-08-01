Content.makeFrontInterface(1200, 1000);

const var spectrumSource =
    Synth.getDisplayBufferSource("ABAnalysisFX");

const var spectrumBufferA = spectrumSource.getDisplayBuffer(0);
const var spectrumBufferB = spectrumSource.getDisplayBuffer(1);

const var spectrumProperties = {
    "BufferLength": 16384,
    "WindowType": "Blackman Harris",
    "DecibelRange": [-100.0, 0.0],
    "UsePeakDecay": false,
    "UseDecibelScale": true,
    "YGamma": 1.0,
    "Decay": 0.7,
    "UseLogarithmicFreqAxis": true
};

spectrumBufferA.setRingBufferProperties(spectrumProperties);
spectrumBufferB.setRingBufferProperties(spectrumProperties);

const var SpectrumPanel = Content.getComponent("SpectrumPanel");

// SpectrumPanel is the shared A/B overlay. Remove SpectrumPanel2 later in the
// HISE interface editor once this migration has been validated.


const var spectrumReadBufferA = Buffer.create(16384);
const var spectrumReadBufferB = Buffer.create(16384);

SpectrumPanel.data.pathA = Content.createPath();
SpectrumPanel.data.pathB = Content.createPath();

const var spectrumFrequencies = [
    20, 50, 100, 200, 500,
    1000, 2000, 5000, 10000, 20000
];

const var spectrumFrequencyLabels = [
    "20", "50", "100", "200", "500",
    "1k", "2k", "5k", "10k", "20k"
];

const var spectrumDbLevels = [0, -20, -40, -60, -80];

inline function getSpectrumArea(panel)
{
    return [
        38,
        8,
        panel.getWidth() - 46,
        panel.getHeight() - 30
    ];
}

inline function updateSpectrumPath(displayBuffer, readBuffer, path, area)
{
    local sampleRate = Engine.getSampleRate();
    local numBins = readBuffer.length;
    local numPoints = Math.max(2, Math.floor(area[2]));
    local i;
    local normalizedX;
    local normalizedY;
    local frequency;
    local binPosition;
    local lowerBin;
    local upperBin;
    local binFraction;
    local lowerGain;
    local upperGain;
    local gain;
    local db;
    local x;
    local y;

    displayBuffer.copyReadBuffer(readBuffer);
    path.clear();

    // Invisible anchors keep the complete plot bounds stable.
    path.startNewSubPath(area[0], area[1]);
    path.startNewSubPath(
        area[0] + area[2],
        area[1] + area[3]
    );

    for (i = 0; i < numPoints; i++)
    {
        normalizedX = i / (numPoints - 1.0);
        frequency = 20.0 * Math.pow(1000.0, normalizedX);

        // FFT bins are linear in frequency; the display is logarithmic.
        binPosition = frequency / sampleRate * (numBins - 1);
        lowerBin = Math.floor(binPosition);
        upperBin = Math.min(lowerBin + 1, numBins - 1);
        binFraction = binPosition - lowerBin;

        lowerGain = readBuffer[lowerBin];
        upperGain = readBuffer[upperBin];
        gain = lowerGain +
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
}

SpectrumPanel.setPaintRoutine(function(g)
{
    var area = getSpectrumArea(this);
    var i;
    var x;
    var y;
    var normalized;

    g.fillAll(0xFF101216);
    g.setFont("Oxygen", 11.0);

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

    g.setColour(0x553F4652);
    g.drawRect(area, 1.0);

    // Source A: blue.
    g.setColour(0xFF55C8FF);
    g.drawPath(this.data.pathA, area, {
        "Thickness": 2.0,
        "JointStyle": "curved",
        "EndCapStyle": "rounded"
    });

    // Source B: red.
    g.setColour(0xFFFF4D4D);
    g.drawPath(this.data.pathB, area, {
        "Thickness": 2.0,
        "JointStyle": "curved",
        "EndCapStyle": "rounded"
    });
});

SpectrumPanel.setTimerCallback(function()
{
    var area = getSpectrumArea(this);

    updateSpectrumPath(
        spectrumBufferA,
        spectrumReadBufferA,
        this.data.pathA,
        area
    );

    updateSpectrumPath(
        spectrumBufferB,
        spectrumReadBufferB,
        this.data.pathB,
        area
    );

    this.repaint();
});

spectrumBufferA.setActive(true);
spectrumBufferB.setActive(true);
SpectrumPanel.startTimer(33);

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
 