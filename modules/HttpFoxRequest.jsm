var EXPORTED_SYMBOLS = [
	"HttpFoxRequest"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxRequest(requestStore, service)
{
	Cu["import"]("resource://httpfox/Utils.jsm");
	Cu["import"]("resource://httpfox/HttpFoxDataHelper.jsm");
	this.ReceivedData = [];
	this.RequestStore = requestStore;
	this.Service = service;
};

HttpFoxRequest.prototype =
{
	// Properties
	Service: null,
	HttpChannel: null,
	ResponseStreamListener: null,
	RequestStore: null,

	IsComplete: false,
	IsAborted: false,
	IsFromCache: false,
	IsRedirected: false,
	HasReceivedResponseHeaders: null,

	// request info types
	RequestHeaders: null,
	ResponseHeaders: null,
	
	PostDataHeaders: null,
	PostData: null,
	PostDataParameters: null,
	PostDataMIMEParts: null,
	PostDataMIMEBoundary: null,
	IsPostDataMIME: null,
	PostDataContentLength: null,
	IsPostDataTooBig: false,
	
	QueryString: null,
	QueryStringParameters: null,
	
	CookiesSent: null,
	CookiesReceived: null,

	// httpchannel infos
	Status: null,
	Url: null,
	URIPath: null,
	URIScheme: null,
	RequestMethod: null,
	IsBackground: false,
	ContentType: null,
	ContentCharset: null,
	ContentLength: null,
	RequestSucceeded: null,
	ResponseStatus: null,
	ResponseStatusText: null,
	EntityId: null,
	RequestProtocolVersion: null,
	ResponseProtocolVersion: null,

	Duration: null,

	Timestamp_StartNet: null,
	Timestamp_StartJs: null,
	Timestamp_EndNet: null,
	Timestamp_EndJs: null,
	Timestamp_PostSent: null,
	Timestamp_ResponseStartedNet: null,
	Timestamp_ResponseStartedJs: null,
	
	ResponseText: "",
	ResponseData: [],
	ResponseSize: 0,

	Log: "",

	AddLog: function(text)
	{
		this.Log += HFU.formatTime(new Date()) + ": " + text + "\n";
	},

	calculateRequestDuration: function()
	{
		if (this.Timestamp_StartNet && this.Timestamp_EndNet) 
		{
			this.Duration = HFU.formatTimeDifference(this.Timestamp_StartNet, this.Timestamp_EndNet);
			return;
		}
		
		this.Duration = HFU.formatTimeDifference(this.Timestamp_StartJs, this.Timestamp_EndJs);
	},

	isReadyToComplete: function()
	{
		if (this.Timestamp_EndJs != null) 
		{
			if (this.IsFromCache)
			{
				return true;
			}
			
			if (this.IsAborted) 
			{
				return true;
			}

			if (this.Timestamp_EndNet != null)
			{
				return true;
			}
		}
		
		return false;
	},

	completeIfReady: function () 
	{
		if (this.isReadyToComplete())
		{
			this.complete();
			this.RequestStore.removeRequestFromPendingRequests(this);
			this.freeResources();
		}
	},
	
	complete: function()
	{
		this.calculateRequestDuration();
		this.IsComplete = true;
		this.Status = this.HttpChannel.status;
		this.AddLog("complete");

		//TODO: check for aborted httpchannel status. here?
		// check redirect
		if (this.Status && this.Status == HttpFoxNsResultErrors.NS_BINDING_REDIRECTED) 
		{
			this.IsRedirected = true;
		}
		
		// update GUI (event...)
		this.Service.requestUpdated();
	},
	
	freeResources: function () 
	{
		if (this.HttpChannel.loadGroup && 
			this.HttpChannel.loadGroup.notificationCallbacks && 
			this.HttpChannel.loadGroup.notificationCallbacks.OriginalListener)
		{
			dump("loadGroup clearing\n");
			this.HttpChannel.loadGroup.notificationCallbacks = this.HttpChannel.loadGroup.notificationCallbacks.OriginalListener;
		}
		else if (this.HttpChannel.notificationCallbacks && 
			this.HttpChannel.notificationCallbacks.OriginalListener)
		{
			dump("root clearing\n");
			this.HttpChannel.notificationCallbacks = this.HttpChannel.notificationCallbacks.OriginalListener;
		}
		
		this.HttpChannel = null;
	},

	isHttpChannelAborted: function () 
	{
		if (this.HttpChannel.status == HttpFoxNsResultErrors.NS_BINDING_ABORTED)
		{
			return true;
		}
	},
	
	isHttpChannelRedirected: function () 
	{
		if (this.HttpChannel.status == HttpFoxNsResultErrors.NS_BINDING_REDIRECTED)
		{
			return true;
		}
	},
	
	setAborted: function(timestamp)
	{
		this.IsAborted = true;
		this.Timestamp_EndJs = timestamp;
		this.AddLog("SetAborted");
	},

	setRedirected: function(timestamp)
	{
		this.IsRedirected = true;
		this.Timestamp_EndJs = timestamp;
		this.AddLog("SetRedirected");
	},

	getBytesLoaded: function()
	{
		if (this.RequestMethod == "HEAD")
		{
			return this.ResponseHeadersSize;
		}
		
		return this.ResponseHeadersSize + this.BytesLoaded;
	},
	
	getBytesLoadedTotal: function()
	{
		if (this.RequestMethod == "HEAD")
		{
			return this.ResponseHeadersSize;
		}
		
		return this.ResponseHeadersSize + this.BytesLoadedTotal;
	},
	
	getBytesSent: function()
	{
		return this.RequestHeadersSize + this.BytesSent;
	},
	
	getBytesSentTotal: function()
	{
		return this.RequestHeadersSize + this.PostDataContentLength;
	},
	
	////////////////
	hasErrorCode: function() 
	{
		if (this.Status && !this.isRedirect())
		{
			return true;
		}
		
		return false;
	},
	
	isRedirect : function()
	{
		//return this.IsRedirected;
		
		if (this.IsRedirected)
		
		if (this.Status && this.Status == HttpFoxNsResultErrors.NS_BINDING_REDIRECTED)
		{
			return true;
		}
		
		return false;
	},
	
	isError : function()
	{
//		if (this.IsComplete && 
//			this.hasErrorCode() && 
//			!this.ResponseStatus)
		if (this.IsComplete && 
			this.hasErrorCode())
		{
			return true;
		}
		
		return false;
	},
	
	isHTTPS : function()
	{
		if (this.URIScheme == "https")
		{
			return true;
		}
		
		return false;
	}
};