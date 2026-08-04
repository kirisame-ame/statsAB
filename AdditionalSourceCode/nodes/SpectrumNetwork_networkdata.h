namespace project
{

struct SpectrumNetwork_networkdata: public scriptnode::dll::InterpretedNetworkData
{
	String getId() const override
	{
		return "SpectrumNetwork";
	}
	bool isModNode() const override
	{
		return false;
	}
	String getNetworkData() const override
	{
		return "199.nT6K8CFV.zdA.H2xj7ATooJ.F.xlLkD2PzzlAmhOBdYKMGSOGUUcLGzk5V5GM+V4h3+XTFyXbBuBVvL3Ai9ojaMEFV1Dko6P0+s2iEbhxKRfQ+AHHFcqg34RxB2iw6V6b9zn7aUOc.POimyUYwvgtMwBIYnaaXbknWDKxXuVj.zyrnR0mPIT5HfdXzMkLBpmBYuXECNCn+3fQuBx3BMqB7.HvHnA8A0.eKArwqFiuZlesKveecWEI.fs3SsvRnCjVAkafzlwwC";
	}
};
}

