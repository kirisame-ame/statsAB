#pragma once

#include "Griffin_Lufs.h"
#include "Griffin_Lufs.h"
// These will improve the readability of the connection definition

#define getT(Idx) template get<Idx>()
#define connectT(Idx, target) template connect<Idx>(target)
#define getParameterT(Idx) template getParameter<Idx>()
#define setParameterT(Idx, value) template setParameter<Idx>(value)
#define setParameterWT(Idx, value) template setWrapParameter<Idx>(value)
using namespace scriptnode;
using namespace snex;
using namespace snex::Types;

namespace ABAnalysisNetwork_impl
{
// ==============================| Node & Parameter type declarations |==============================

struct matrix_t_matrix: public routing::static_matrix<8, matrix_t_matrix, false>
{
	static constexpr int channels[8] =
	{
		0, 0, 2, 2, 4, 5, 6, 7
	};
};
using fft_t = wrap::data<analyse::fft, 
                         data::external::displaybuffer<0>>;
using fft1_t = wrap::data<analyse::fft, 
                          data::external::displaybuffer<1>>;

using multi1_t = container::multi<parameter::empty, 
                                  wrap::fix<4, fft_t>, 
                                  wrap::fix<4, fft1_t>>;

template <int NV>
using chain1_t = container::chain<parameter::empty, 
                                  wrap::fix<8, routing::matrix<matrix_t_matrix>>, 
                                  multi1_t, 
                                  core::gain<NV>>;
using goniometer_t = wrap::data<analyse::goniometer, 
                                data::external::displaybuffer<2>>;

using global_cable_t_index = runtime_target::indexers::fix_hash<-992231199>;
using peak_mod = parameter::plain<routing::global_cable<global_cable_t_index, parameter::empty>, 
                                  0>;
using peak_t = wrap::mod<peak_mod, 
                         wrap::no_data<core::peak>>;

using global_cable2_t_index = runtime_target::indexers::fix_hash<-1091814824>;
DECLARE_PARAMETER_RANGE(Griffin_Lufs1_modRange, 
                        -100., 
                        0.);

using Griffin_Lufs1_mod = parameter::from0To1<routing::global_cable<global_cable2_t_index, parameter::empty>, 
                                              0, 
                                              Griffin_Lufs1_modRange>;

template <int NV>
using Griffin_Lufs1_t = wrap::mod<Griffin_Lufs1_mod, 
                                  project::Griffin_Lufs<NV>>;

template <int NV>
using chain2_t = container::chain<parameter::empty, 
                                  wrap::fix<4, goniometer_t>, 
                                  peak_t, 
                                  routing::global_cable<global_cable_t_index, parameter::empty>, 
                                  Griffin_Lufs1_t<NV>, 
                                  routing::global_cable<global_cable2_t_index, parameter::empty>>;
using goniometer1_t = wrap::data<analyse::goniometer, 
                                 data::external::displaybuffer<3>>;

using global_cable1_t_index = runtime_target::indexers::fix_hash<-992231198>;
using peak1_mod = parameter::plain<routing::global_cable<global_cable1_t_index, parameter::empty>, 
                                   0>;
using peak1_t = wrap::mod<peak1_mod, 
                          wrap::no_data<core::peak>>;

using global_cable3_t_index = runtime_target::indexers::fix_hash<-1091814823>;
using Griffin_Lufs_mod = parameter::from0To1<routing::global_cable<global_cable3_t_index, parameter::empty>, 
                                             0, 
                                             Griffin_Lufs1_modRange>;

template <int NV>
using Griffin_Lufs_t = wrap::mod<Griffin_Lufs_mod, 
                                 project::Griffin_Lufs<NV>>;

template <int NV>
using chain3_t = container::chain<parameter::empty, 
                                  wrap::fix<4, goniometer1_t>, 
                                  peak1_t, 
                                  routing::global_cable<global_cable1_t_index, parameter::empty>, 
                                  Griffin_Lufs_t<NV>, 
                                  routing::global_cable<global_cable3_t_index, parameter::empty>>;

template <int NV>
using multi2_t = container::multi<parameter::empty, 
                                  wrap::fix<4, chain2_t<NV>>, 
                                  wrap::fix<4, chain3_t<NV>>>;

template <int NV>
using chain_t = container::chain<parameter::empty, 
                                 wrap::fix<8, multi2_t<NV>>>;

template <int NV>
using split_t = container::split<parameter::empty, 
                                 wrap::fix<8, chain1_t<NV>>, 
                                 chain_t<NV>>;

template <int NV>
using ABAnalysisNetwork_t_ = container::chain<parameter::empty, 
                                              wrap::fix<8, split_t<NV>>>;

// =================================| Root node initialiser class |=================================

template <int NV> struct instance: public ABAnalysisNetwork_impl::ABAnalysisNetwork_t_<NV>
{
	
	struct metadata
	{
		static const int NumTables = 0;
		static const int NumSliderPacks = 0;
		static const int NumAudioFiles = 0;
		static const int NumFilters = 0;
		static const int NumDisplayBuffers = 4;
		
		SNEX_METADATA_ID(ABAnalysisNetwork);
		SNEX_METADATA_NUM_CHANNELS(8);
		SNEX_METADATA_ENCODED_PARAMETERS(2)
		{
			0x0000, 0x0000
		};
		SNEX_METADATA_ENCODED_MOD_INFO(2)
		{
			0x3D3B, 0x003E
		};
	};
	
	instance()
	{
		// Node References -------------------------------------------------------------------------
		
		auto& split = this->getT(0);                                         // ABAnalysisNetwork_impl::split_t<NV>
		auto& chain1 = this->getT(0).getT(0);                                // ABAnalysisNetwork_impl::chain1_t<NV>
		auto& matrix = this->getT(0).getT(0).getT(0);                        // routing::matrix<matrix_t_matrix>
		auto& multi1 = this->getT(0).getT(0).getT(1);                        // ABAnalysisNetwork_impl::multi1_t
		auto& fft = this->getT(0).getT(0).getT(1).getT(0);                   // ABAnalysisNetwork_impl::fft_t
		auto& fft1 = this->getT(0).getT(0).getT(1).getT(1);                  // ABAnalysisNetwork_impl::fft1_t
		auto& gain = this->getT(0).getT(0).getT(2);                          // core::gain<NV>
		auto& chain = this->getT(0).getT(1);                                 // ABAnalysisNetwork_impl::chain_t<NV>
		auto& multi2 = this->getT(0).getT(1).getT(0);                        // ABAnalysisNetwork_impl::multi2_t<NV>
		auto& chain2 = this->getT(0).getT(1).getT(0).getT(0);                // ABAnalysisNetwork_impl::chain2_t<NV>
		auto& goniometer = this->getT(0).getT(1).getT(0).getT(0).getT(0);    // ABAnalysisNetwork_impl::goniometer_t
		auto& peak = this->getT(0).getT(1).getT(0).getT(0).getT(1);          // ABAnalysisNetwork_impl::peak_t
		auto& global_cable = this->getT(0).getT(1).getT(0).getT(0).getT(2);  // routing::global_cable<global_cable_t_index, parameter::empty>
		auto& Griffin_Lufs1 = this->getT(0).getT(1).getT(0).getT(0).getT(3); // ABAnalysisNetwork_impl::Griffin_Lufs1_t<NV>
		auto& global_cable2 = this->getT(0).getT(1).getT(0).getT(0).getT(4); // routing::global_cable<global_cable2_t_index, parameter::empty>
		auto& chain3 = this->getT(0).getT(1).getT(0).getT(1);                // ABAnalysisNetwork_impl::chain3_t<NV>
		auto& goniometer1 = this->getT(0).getT(1).getT(0).getT(1).getT(0);   // ABAnalysisNetwork_impl::goniometer1_t
		auto& peak1 = this->getT(0).getT(1).getT(0).getT(1).getT(1);         // ABAnalysisNetwork_impl::peak1_t
		auto& global_cable1 = this->getT(0).getT(1).getT(0).getT(1).getT(2); // routing::global_cable<global_cable1_t_index, parameter::empty>
		auto& Griffin_Lufs = this->getT(0).getT(1).getT(0).getT(1).getT(3);  // ABAnalysisNetwork_impl::Griffin_Lufs_t<NV>
		auto& global_cable3 = this->getT(0).getT(1).getT(0).getT(1).getT(4); // routing::global_cable<global_cable3_t_index, parameter::empty>
		
		// Modulation Connections ------------------------------------------------------------------
		
		peak.getParameter().connectT(0, global_cable);           // peak -> global_cable::Value
		Griffin_Lufs1.getParameter().connectT(0, global_cable2); // Griffin_Lufs1 -> global_cable2::Value
		peak1.getParameter().connectT(0, global_cable1);         // peak1 -> global_cable1::Value
		Griffin_Lufs.getParameter().connectT(0, global_cable3);  // Griffin_Lufs -> global_cable3::Value
		
		// Default Values --------------------------------------------------------------------------
		
		gain.setParameterT(0, -100.); // core::gain::Gain
		gain.setParameterT(1, 20.);   // core::gain::Smoothing
		gain.setParameterT(2, 0.);    // core::gain::ResetValue
		
		; // global_cable::Value is automated
		
		Griffin_Lufs1.setParameterT(0, 300.);     // project::Griffin_Lufs::LUFSWindowms
		Griffin_Lufs1.setParameterT(1, 0.817982); // project::Griffin_Lufs::Overlap
		
		; // global_cable2::Value is automated
		
		; // global_cable1::Value is automated
		
		Griffin_Lufs.setParameterT(0, 300.); // project::Griffin_Lufs::LUFSWindowms
		Griffin_Lufs.setParameterT(1, 0.75); // project::Griffin_Lufs::Overlap
		
		; // global_cable3::Value is automated
		
		this->setExternalData({}, -1);
	}
	~instance() override
	{
		// Cleanup external data references --------------------------------------------------------
		
		this->setExternalData({}, -1);
	}
	
	static constexpr bool isPolyphonic() { return NV > 1; };
	
	static constexpr bool hasTail() { return true; };
	
	static constexpr bool isSuspendedOnSilence() { return false; };
	
	void connectToRuntimeTarget(bool addConnection, const runtime_target::connection& c)
	{
		// Runtime target Connections --------------------------------------------------------------
		
		this->getT(0).getT(1).getT(0).getT(0).getT(2).connectToRuntimeTarget(addConnection, c); // routing::global_cable<global_cable_t_index, parameter::empty>
		this->getT(0).getT(1).getT(0).getT(0).getT(4).connectToRuntimeTarget(addConnection, c); // routing::global_cable<global_cable2_t_index, parameter::empty>
		this->getT(0).getT(1).getT(0).getT(1).getT(2).connectToRuntimeTarget(addConnection, c); // routing::global_cable<global_cable1_t_index, parameter::empty>
		this->getT(0).getT(1).getT(0).getT(1).getT(4).connectToRuntimeTarget(addConnection, c); // routing::global_cable<global_cable3_t_index, parameter::empty>
	}
	
	void setExternalData(const ExternalData& b, int index)
	{
		// External Data Connections ---------------------------------------------------------------
		
		this->getT(0).getT(0).getT(1).getT(0).setExternalData(b, index);         // ABAnalysisNetwork_impl::fft_t
		this->getT(0).getT(0).getT(1).getT(1).setExternalData(b, index);         // ABAnalysisNetwork_impl::fft1_t
		this->getT(0).getT(1).getT(0).getT(0).getT(0).setExternalData(b, index); // ABAnalysisNetwork_impl::goniometer_t
		this->getT(0).getT(1).getT(0).getT(0).getT(1).setExternalData(b, index); // ABAnalysisNetwork_impl::peak_t
		this->getT(0).getT(1).getT(0).getT(1).getT(0).setExternalData(b, index); // ABAnalysisNetwork_impl::goniometer1_t
		this->getT(0).getT(1).getT(0).getT(1).getT(1).setExternalData(b, index); // ABAnalysisNetwork_impl::peak1_t
	}
};
}

#undef getT
#undef connectT
#undef setParameterT
#undef setParameterWT
#undef getParameterT
// ======================================| Public Definition |======================================

namespace project
{
// polyphonic template declaration

template <int NV>
using ABAnalysisNetwork = wrap::node<ABAnalysisNetwork_impl::instance<NV>>;
}


