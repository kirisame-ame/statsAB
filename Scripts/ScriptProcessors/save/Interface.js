Content.makeFrontInterface(1200, 1000);
const var rm = Engine.getGlobalRoutingManager();

const var peakACable = rm.getCable("peak_A");
const var peakBCable = rm.getCable("peak_B");
const var lufsACable  = rm.getCable("lufs_A");
const var lufsBCable  = rm.getCable("lufs_B");
lufsACable.setRange(-100.0, 0.0);
lufsBCable.setRange(-100.0, 0.0);



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
const var peakAMeter = Content.getComponent("peakASlider");
const var lufsAMeter = Content.getComponent("lufsASlider");
const var peakBMeter = Content.getComponent("peakBSlider");
const var lufsBMeter = Content.getComponent("lufsBSlider");

const var label_lufs_A = Content.getComponent("label_lufs_A");
const var label_lufs_B = Content.getComponent("label_lufs_B");
const var label_peak_A = Content.getComponent("label_peak_A");
const var label_peak_B = Content.getComponent("label_peak_B");

const var meter_laf = Content.createLocalLookAndFeel();
meter_laf.setStyleSheet("meters.css");

peakAMeter.setLocalLookAndFeel(meter_laf);
lufsAMeter.setLocalLookAndFeel(meter_laf);
peakBMeter.setLocalLookAndFeel(meter_laf);
lufsBMeter.setLocalLookAndFeel(meter_laf);

const var GoniometerPanel = Content.getComponent("GoniometerPanel")

const var goniometerBufferA = spectrumSource.getDisplayBuffer(2);
const var goniometerBufferB = spectrumSource.getDisplayBuffer(3);
// The HISE goniometer ring buffer is 512 samples in this build.
const var goniometerReadBufferAL = Buffer.create(512);
const var goniometerReadBufferAR = Buffer.create(512);
const var goniometerReadBufferBL = Buffer.create(512);
const var goniometerReadBufferBR = Buffer.create(512);

const var goniometerReadBuffersA = [
    goniometerReadBufferAL,
    goniometerReadBufferAR
];

const var goniometerReadBuffersB = [
    goniometerReadBufferBL,
    goniometerReadBufferBR
];

GoniometerPanel.data.pathA = Content.createPath();
GoniometerPanel.data.pathB = Content.createPath();





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

inline function updateGoniometerPath(displayBuffer, readBuffers, path, area)
{
    local i;
    local numPoints;
    local left;
    local right;
    local mid;
    local side;
    local x;
    local y;
    
    

    // Initial assumption: the goniometer buffer contains interleaved L/R.
    // Convert each pair to M/S coordinates for a centred stereo-field plot.
    displayBuffer.copyReadBuffer(readBuffers);
    path.clear();
    local leftBuffer = readBuffers[0];
	local rightBuffer = readBuffers[1];
	local numPoints = 512;

    for(i = 0; i < numPoints; i++)
    {
        left = leftBuffer[i];
    	right = rightBuffer[i];
        mid = Math.range(0.5 * (left + right), -1.0, 1.0);
        side = Math.range(0.5 * (left - right), -1.0, 1.0);

        x = area[0] + 0.5 * (side + 1.0) * area[2];
        y = area[1] + (1.0 - 0.5 * (mid + 1.0)) * area[3];

        if(i == 0)
            path.startNewSubPath(x, y);
        else
            path.lineTo(x, y);
    }
}

inline function paintGoniometerGrid(g, panel, title)
{
    local area = [34, 24, panel.getWidth()-68, panel.getHeight() - 48];
    local left = area[0];
    local top = area[1];
    local right = area[0] + area[2];
    local bottom = area[1] + area[3];
    local centreX = left + area[2] * 0.5;
    local centreY = top + area[3] * 0.5;

    g.fillAll(0xFF101216);
    g.setFont("Oxygen", 11.0);
    g.setColour(0xFF9299A6);
    g.drawAlignedText(title, [area[0], 4, area[2], 16], "centred");

    g.setColour(0x283F4652);
    g.drawRect(area, 1.0);
    g.drawHorizontalLine(Math.round(centreY), left, right);
    g.drawVerticalLine(Math.round(centreX), top, bottom);

    // HISE drawLine uses the argument order x1, x2, y1, y2, thickness.
    g.drawLine(left, right, top, bottom, 1.0); // NW -> SE
    g.drawLine(left, right, bottom, top, 1.0); // SW -> NE

    g.drawEllipse(area, 1.0);

    g.setColour(0xFF687181);
    g.drawAlignedText("M", [centreX - 14, top + 4, 28, 14], "centred");
    g.drawAlignedText("L", [left + 4, top + 4, 24, 14], "left");
    g.drawAlignedText("R", [right - 28, top + 4, 24, 14], "right");
    g.drawAlignedText("S", [left - 28, centreY - 7, 24, 14], "right");
    g.drawAlignedText("S", [right + 4, centreY - 7, 24, 14], "left");
}

inline function drawGoniometerDots(g, readBuffers, area)
{
    local i;
    local numPoints = 512;
    local leftBuffer = readBuffers[0];
	local rightBuffer = readBuffers[1];
	local left;
	local right;
    local mid;
    local side;
    local x;
    local y;
    local dotSize = 3.0;

    for(i = 0; i < numPoints; i++)
    {
        left = leftBuffer[i];
        right = rightBuffer[i];
        mid = Math.range(0.5 * (left + right), -1.0, 1.0);
        side = Math.range(0.5 * (left - right), -1.0, 1.0);
        x = area[0] + 0.5 * (side + 1.0) * area[2];
        
        y = area[1] + (1.0 - 0.5 * (mid + 1.0)) * area[3];
        g.fillEllipse([x - dotSize * 0.5, y - dotSize * 0.5, dotSize, dotSize]);
    }
}
GoniometerPanel.setPaintRoutine(function(g)
{
    var area = [34, 24, this.getWidth() - 68, this.getHeight() - 48];

    paintGoniometerGrid(g, this, "GONIOMETER");

    g.setColour(0x9955C8FF);
    drawGoniometerDots(g, goniometerReadBuffersA, area);

    g.setColour(0x99FF4D4D);
    drawGoniometerDots(g, goniometerReadBuffersB, area);
});

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

    updateGoniometerPath(
    goniometerBufferA,
    goniometerReadBuffersA,
    GoniometerPanel.data.pathA,
    [34, 24, GoniometerPanel.getWidth() - 46, GoniometerPanel.getHeight() - 48]
);

updateGoniometerPath(
    goniometerBufferB,
    goniometerReadBuffersB,
    GoniometerPanel.data.pathB,
    [34, 24, GoniometerPanel.getWidth() - 46, GoniometerPanel.getHeight() - 48]
);

    this.repaint();
    GoniometerPanel.repaint();
 
    local peak_db_A = Engine.getDecibelsForGainFactor(
            Math.max(peakACable.getValue(), 0.00001)
        );
 	peakAMeter.setValue(Math.max(
        -100.0, peak_db_A
        
    ));
    label_peak_A.set("text",Engine.doubleToString(peak_db_A, 1));
    
 	lufsAMeter.setValue(lufsACable.getValue());
 	label_lufs_A.set("text", Engine.doubleToString(lufsACable.getValue(),1));
 	
 	local peak_db_B = Engine.getDecibelsForGainFactor(
 	            Math.max(peakBCable.getValue(), 0.00001)
 	        );
 	peakBMeter.setValue(Math.max(
 	        -100.0,
 	        peak_db_B
 	    ));
 	    
    label_peak_B.set("text",Engine.doubleToString(peak_db_B, 1));
    
 	lufsBMeter.setValue(lufsBCable.getValue());
 	label_lufs_B.set("text", Engine.doubleToString(lufsBCable.getValue(),1));
});

spectrumBufferA.setActive(true);
spectrumBufferB.setActive(true);
goniometerBufferA.setActive(true);
goniometerBufferB.setActive(true);
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
 