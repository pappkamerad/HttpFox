var EXPORTED_SYMBOLS = [
	"HttpFoxObserver"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxObserver(service)
{
	Cu["import"]("resource://httpfox/HttpFoxRequest.jsm");
	Cu["import"]("resource://httpfox/HttpFoxRequestStore.jsm");
	Cu["import"]("resource://httpfox/HttpFoxResponseStreamListener.jsm");
	Cu["import"]("resource://httpfox/HttpFoxEventProcessor.jsm");
	Cu["import"]("resource://httpfox/Utils.jsm");
	
	this.Service = service;
	this.RequestStore = service.RequestStore;
	this.EventProcessor = new HttpFoxEventProcessor(service);
};

HttpFoxObserver.prototype =
{
	// Properties
	Service: null, // NEEDED?
	RequestStore: null,
	EventProcessor: null,
	
	// start observing
	start: function ()
	{
		this.addListener();
	},

	// end observing
	stop: function ()
	{
		this.removeListener();
	},

	addListener: function ()
	{
		//dump("adding listeners\n");
		// Register listeners
		var observerService = Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService);
		observerService.addObserver(this, "http-on-modify-request", false);
		observerService.addObserver(this, "http-on-examine-response", false);
		observerService.addObserver(this, "http-on-examine-cached-response", false);

		var activityDistributor = Cc["@mozilla.org/network/http-activity-distributor;1"]
			.getService(Components.interfaces.nsIHttpActivityDistributor);
		activityDistributor.addObserver(this);
	},

	removeListener: function ()
	{
		// Unregistering listeners
		var observerService = Cc["@mozilla.org/observer-service;1"]
			.getService(Ci.nsIObserverService);
		observerService.removeObserver(this, "http-on-modify-request");
		observerService.removeObserver(this, "http-on-examine-response");
		observerService.removeObserver(this, "http-on-examine-cached-response");

		var activityDistributor = Cc["@mozilla.org/network/http-activity-distributor;1"]
			.getService(Components.interfaces.nsIHttpActivityDistributor);
		activityDistributor.removeObserver(this);
	},

	// nsIObserver
	observe: function (subject, topic, data)
	{
		if (topic == 'http-on-modify-request')
		{
			// check if this is a http request
			if (!HFU.isHttpChannel(subject)) { return; }

			//dump("* MODIFY REQUEST: " + subject.loadGroup + "; CB: " + subject.notificationCallbacks + "; group: " + (subject.loadGroup ? subject.loadGroup.groupObserver : "nada") + " [" + subject.URI.asciiSpec + "]\n");
			//dump("-* group CB: " + (subject.loadGroup ? subject.loadGroup.notificationCallbacks : "nada") + "\n");

			if (subject.loadGroup && 
				subject.loadGroup.notificationCallbacks && 
				subject.loadGroup.notificationCallbacks.OriginalListener)
			{
				dump(".:*:. loadGroup OriginalListener\n");
			}

//			if (subject.loadGroup && subject.loadGroup.notificationCallbacks)
//			{
//				//dump("count: " + subject.loadGroup.activeCount + "\n");
//				//dump(".:*:. set loadGroup\n");
//				var myListener = new HttpFoxEventSink(subject.loadGroup.notificationCallbacks, this.EventProcessor);
//				subject.loadGroup.notificationCallbacks = myListener;
//			}
////			else if (subject.loadGroup)
////			{
////				dump(".:*:. loadgroup ubt no notificationCB: " + subject.loadGroup.notificationCallbacks + " - root CB:" + subject.notificationCallbacks + "\n");
////				var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
////				subject.loadGroup.notificationCallbacks = myListener;
////			}
//			else 
//			{
//				//dump(".:*:. set root\n");
//				var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
//				subject.notificationCallbacks = myListener;
//			}
			
			// just everything
			var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
			subject.notificationCallbacks = myListener;

			//if (httpChannel.notificationCallbacks)
			//{
				//var myListener = new FoxyStreamListener(httpChannel.notificationCallbacks, this);
			
			// attach notification listener
			//var myListener = new HttpFoxEventSink(subject.notificationCallbacks, this.EventProcessor);
			//subject.notificationCallbacks = myListener;
			
			//}

			// process
			this.EventProcessor.onModifyRequest(subject);
			//this.RequestStore.addNewRequest(request);
			//this.Service.requestAdded(request);
		}
		else if (topic == 'http-on-examine-response')
		{
			// check if this is a http request
			if (!HFU.isHttpChannel(subject)) { return; }

			//var request = this.getMatchingRequest(subject);
			//if (!request) { return; }

			//this.EventProcessor.onExamineResponse(request);
			this.EventProcessor.onExamineResponse(subject);
					
//			if (this.isStreamListenerNeeded(request))
//			{
//				this.attachStreamListener(request, subject);
//			}
//			else
//			{
//				this.RequestStore.setObserverFinished(request);
//			}
//			this.Service.requestUpdated();
		}
		else if (topic == 'http-on-examine-cached-response')
		{
			// check if this is a http request
			if (!HFU.isHttpChannel(subject)) { return; }

			//var request = this.getMatchingRequest(subject);
			//if (!request) { return; }
		
			this.EventProcessor.onExamineCachedResponse(subject);

			//this.attachStreamListener(request, subject);
		
			//this.Service.requestUpdated();
		}
	},

	// nsIHttpActivity
	observeActivity: function(httpChannel, activityType, activitySubType, timestamp, extraSizeData, extraStringData)
    {
		// get request
		if (!HFU.isHttpChannel(httpChannel)) { return; }

//		var request = this.getMatchingRequest(httpChannel);
//		if (!request) { return; }

		this.EventProcessor.onActivity(httpChannel, activityType, activitySubType, timestamp, extraSizeData, extraStringData);

//		if (activityType == Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION) 
//		{
//			this.EventProcessor.onHttpActivity(request, activitySubType, timestamp, extraSizeData, extraStringData);
//		}
//		else 
//		{
//			this.EventProcessor.onSocketActivity(request, activitySubType, timestamp, extraSizeData, extraStringData);
//		}
    },
	
//	getMatchingRequest: function(httpChannel)
//	{
//		var request = this.RequestStore.getMatchingRequest(httpChannel);
//		if (request == null) 
//		{
//			dump("no matching request found (" + httpChannel.URI.asciiSpec + ")\n");
//			if (arguments.length > 1) {dump("--: " + httpChannel + "\n"); }
//			return null;
//		}
//		if (arguments.length > 1) { dump("! matching request found (" + httpChannel.URI.asciiSpec + ") " + httpChannel + "\n"); }
//		return request;
//	},
//	
//	isStreamListenerNeeded: function(request)
//	{
//		// TODO: setting with list of codes to stop further processing (listening to response content)
//		// OR listen to channelredirect events
//		if (request.ResponseStatus == 302 || request.ResponseStatus == 301) 
//		{
//			return false;
//		}

//		return true;
//	},

//	attachStreamListener: function(request, httpChannel)
//	{
//		// attach response stream listener if wanted
//		var streamListener = new HttpFoxResponseStreamListener(this.EventProcessor);
//		httpChannel.QueryInterface(Ci.nsITraceableChannel);
//		streamListener.OriginalListener = httpChannel.setNewListener(streamListener);
//		streamListener.Request = request;
//	},

	// nsISupportsString
	data: "HttpFoxObserver",

	toString: function ()
	{
		return "HttpFoxObserver";
	},

	// nsISupports
	QueryInterface: function (iid)
	{
		if (!iid.equals(Ci.nsISupports) &&
			!iid.equals(Ci.nsISupportsWeakReference) &&
			!iid.equals(Ci.nsIObserver) &&
			//!iid.equals(Ci.nsIWebProgressListener) &&
			//!iid.equals(Ci.nsIURIContentListener) &&
			!iid.equals(Ci.nsIStreamListener) &&
			!iid.equals(Ci.nsIRequestObserver) &&
			!iid.equals(Ci.nsISupportsString))
		{
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}

		return this;
	}
};

function HttpFoxEventSink(originalListener, eventProcessor)
{
	this.OriginalListener = originalListener;
	this.EventProcessor = eventProcessor;
}

HttpFoxEventSink.prototype = 
{
	OriginalListener: null,
	EventProcessor: null,
  
	// nsIChannelEventSink
	asyncOnChannelRedirect: function(aOldChannel, aNewChannel, aFlags, callback)
	{
		dump("-> asyncOnChannelRedirect (flags: " + aFlags + ")\n");
		//try 
		//{
			//this.OriginalListener.QueryInterface(Ci.nsIProgressEventSink).onStatus(aRequest, aContext, aStatus, aStatusArg, "jo"); 

	//		if (HFU.isHttpChannel(aRequest)) 
	//		{ 
	//			//var pr = this.Observer.getMatchingRequest(aRequest.QueryInterface(Ci.nsIHttpChannel));
	//			//if (pr) 
	//			//{
	//				this.EventProcessor.onChannelRedirect(aRequest, aProgress, aProgressMax); 
	//			//}
	//		}

		if (this.OriginalListener)
		{
			try 
			{
				this.OriginalListener.QueryInterface(Ci.nsIInterfaceRequestor)
			}
			catch(e) {dump("\n<--->EXC onStatus QueryI: " + e + "\n");}

			var x = null;
			try 
			{
				this.OriginalListener
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIChannelEventSink)
					.asyncOnChannelRedirect(aOldChannel, aNewChannel, aFlags, callback);
			}
			catch(e) { /* OriginalListener does not support this interface */ }

//			if (x) 
//			{
//				
//			}
//			else
//			{
//				dump("interface n/a on originallistener\n");
//			}
		}
	},

	onChannelRedirect: function (aOldChannel, aNewChannel, aFlags) 
	{
		dump("-> onChannelRedirect (flags: " + aFlags + ")\n");
		//try 
		//{
			//this.OriginalListener.QueryInterface(Ci.nsIProgressEventSink).onStatus(aRequest, aContext, aStatus, aStatusArg, "jo"); 

			if (this.OriginalListener)
			{
				try 
				{
					this.OriginalListener.QueryInterface(Ci.nsIInterfaceRequestor)
				}
				catch(e) 
				{
					dump("\n<--->EXC onStatus QueryI: " + e + "\n");
				}

				var x = null;
				try 
				{
					this.OriginalListener
						.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIChannelEventSink)
						.onChannelRedirect(aOldChannel, aNewChannel, aFlags);
				}
				catch(e) { /* OriginalListener does not support this interface */ }

	//			if (x) 
	//			{
	//				
	//			}
	//			else
	//			{
	//				dump("interface n/a on originallistener\n");
	//			}
			}
	},
 
	// nsIProgressEventSink (not implementing will cause annoying exceptions)
	onProgress: function (aRequest, aContext, aProgress, aProgressMax) 
	{ 
		//dump("-> onProgress: " + aRequest.URI.asciiSpec + " \n");
		//try 
		//{
			//this.OriginalListener.QueryInterface(Ci.nsIProgressEventSink).onStatus(aRequest, aContext, aStatus, aStatusArg, "jo"); 
			if (HFU.isHttpChannel(aRequest)) 
			{ 
				//var pr = this.Observer.getMatchingRequest(aRequest.QueryInterface(Ci.nsIHttpChannel));
				//if (pr) 
				//{
					this.EventProcessor.onEventSinkProgress(aRequest, aProgress, aProgressMax); 
				//}
			}

			if (this.OriginalListener)
			{
				try 
				{
					this.OriginalListener.QueryInterface(Ci.nsIInterfaceRequestor);
				}
				catch(e) 
				{
					dump("\n<--->EXC onStatus QueryI: " + e + "\n");
				}

				try 
				{
					this.OriginalListener
						.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIProgressEventSink)
						.onProgress(aRequest, aContext, aProgress, aProgressMax);
				}
				catch(e) 
				{
					/* OriginalListener does not support this interface */
				}
			}
		//}
		//catch(e) {dump("EXC onStatus: " + e + "\n");}
	},
	
	onStatus : function (aRequest, aContext, aStatus, aStatusArg) { 
		//dump("-> onStatus: " + aStatus + " ;Args: " + aStatusArg + "\n");
		//try 
		//{
			//this.OriginalListener.QueryInterface(Ci.nsIProgressEventSink).onStatus(aRequest, aContext, aStatus, aStatusArg, "jo"); 
			if (HFU.isHttpChannel(aRequest)) 
			{ 
				this.EventProcessor.onEventSinkStatus(aRequest, aStatus, aStatusArg); 
			}

			if (this.OriginalListener)
			{
				try 
				{
					this.OriginalListener.QueryInterface(Ci.nsIInterfaceRequestor)
				}
				catch(e) 
				{
					dump("\n<--->EXC onStatus QueryI: " + e + "\n");
				}

				var x = null;
				try {
					this.OriginalListener
						.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIProgressEventSink)
						.onStatus(aRequest, aContext, aStatus, aStatusArg);
				}
				catch(e) { /* OriginalListener does not support this interface */ }
			}
		//}
		//catch(e) {dump("EXC onStatus: " + e + "\n");}
	},
 
	getInterface: function(iid) 
	{
		//dump("getInterface, iid requested: " + iid.number + "\n");
		if (iid.equals(Ci.nsIProgressEventSink)
			|| iid.equals(Ci.nsIChannelEventSink)
		)
		{
			return this;
		}
		if (this.OriginalListener)
		{
			return this.OriginalListener.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(iid);
		}
		else 
		{
			Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
			return null;
		}
	},

	QueryInterface: function(iid) 
	{
		if (iid.equals(Ci.nsIInterfaceRequestor) ||
			iid.equals(Ci.nsISupports))
		{
			return this;
		}
			
		Components.returnCode = Components.results.NS_ERROR_NO_INTERFACE;
		return null;
	}
};