var EXPORTED_SYMBOLS = [
	"HttpFoxEventProcessor"
];

// standard shortcuts
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

function HttpFoxEventProcessor(service)
{
	Cu["import"]("resource://httpfox/HttpFoxRequest.jsm");
	Cu["import"]("resource://httpfox/HttpFoxDataHelper.jsm");
	Cu["import"]("resource://httpfox/HttpFoxResponseStreamListener.jsm");
	Cu["import"]("resource://httpfox/Utils.jsm");
	this.Service = service;
	this.RequestStore = service.RequestStore;
}

HttpFoxEventProcessor.prototype =
{
	Service: null,
	RequestStore: null,

	// Events
	onActivity: function(httpChannel, activityType, activitySubType, timestamp, extraSizeData, extraStringData)
	{
		var request = null;
		if (activityType == Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION) 
		{
			// HttpActivity
			request = this.getMatchingRequest(httpChannel);
			if (!request) { return; }
			
			// process
			this.onHttpActivity(request, activitySubType, timestamp, extraSizeData, extraStringData);
		}
		else 
		{
			// SocketActivity
			// care only for some events
			if (activitySubType == Ci.nsISocketTransport.STATUS_SENDING_TO) 
			{
				request = this.getMatchingRequest(httpChannel);
				if (!request) { return; }

				// process
				this.onSocketActivity(request, activitySubType, timestamp, extraSizeData, extraStringData);
			}
		}
	},

	onHttpActivity: function (request, activitySubType, timestamp, extraSizeData, extraStringData)
	{
		var nsIHttpActivityObserver = Ci.nsIHttpActivityObserver;
		
		// milliseconds are enough (convert from micro)
		timestamp /= 1000;
		
		// network is involved
		request.IsNetwork = true;
		
		switch (activitySubType)
		{
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_HEADER:
				// The HTTP request is about to be queued for sending. Observers can look at request headers in aExtraStringData
				request.Timestamp_StartNet = timestamp;
				request.RequestHeaderSize = extraStringData.length;
				request.AddLog("onHttpActivity (subType: ACTIVITY_SUBTYPE_REQUEST_HEADER" 
					+ " (timestamp: " + timestamp + ") + (extraSizeData: " + extraSizeData + ")");
				break;
				
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT:
				// The HTTP request's body has been sent.
				request.Timestamp_PostSent = timestamp;
				request.AddLog("onHttpActivity (subType: ACTIVITY_SUBTYPE_REQUEST_BODY_SENT" 
					+ " (timestamp: " + timestamp + ") + (extraSizeData: " + extraSizeData + ")");
				break;
				
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_START:
				// The HTTP response has started to arrive.
				request.Timestamp_ResponseStarted = timestamp;
				request.AddLog("onHttpActivity (subType: ACTIVITY_SUBTYPE_RESPONSE_START" 
					+ " (timestamp: " + timestamp + ") + (extraSizeData: " + extraSizeData + ")");
				break;
				
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_HEADER:
				// The HTTP response header has arrived.
				request.Timestamp_ResponseHeadersComplete = timestamp;
				request.ResponseHeaderSize = extraStringData.length;
				request.AddLog("onHttpActivity (subType: ACTIVITY_SUBTYPE_RESPONSE_HEADER" 
					+ " (timestamp: " + timestamp + ") + (extraSizeData: " + extraSizeData + ")");
				break;
				
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE:
				// The complete HTTP response has been received.
				request.ContentSizeFromNet = extraSizeData;
				request.AddLog("onHttpActivity (subType: ACTIVITY_SUBTYPE_RESPONSE_COMPLETE" 
					+ " (timestamp: " + timestamp + ") (extraSizeData: " + extraSizeData 
					+ ") (httpChannelStatus: " + request.HttpChannel.status + ")");
				break;
				
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE:
				// 	The HTTP transaction has been closed.
				request.Timestamp_EndNet = timestamp;
				request.Timestamp_EndJs = HFU.now();
				request.IsHttpTransactionClosed = true;
				request.AddLog("onHttpActivity (subType: ACTIVITY_SUBTYPE_TRANSACTION_CLOSE" 
					+ " (timestamp: " + timestamp + ")" + " (httpChannelStatus: " + request.HttpChannel.status 
					+ ") + (extraSizeData: " + extraSizeData + ")");

				// check for special http channel status
				request.checkHttpChannelStatus(timestamp);

				// check if complete
				request.finishIfReady();
				break;
		}
	},

	onSocketActivity: function (request, activitySubType, timestamp, extraSizeData, extraStringData)
	{
		var nsISocketTransport = Ci.nsISocketTransport;
		switch (activitySubType)
		{
			case nsISocketTransport.STATUS_RESOLVING:
				// Transport is resolving the host. Usually a DNS lookup.
				request.AddLog("STATUS_RESOLVING" + " (timestamp: " + timestamp + ")");
				break;
			case nsISocketTransport.STATUS_CONNECTING_TO:
				request.AddLog("STATUS_CONNECTING_TO" + " (timestamp: " + timestamp + ")");
				break;
			case nsISocketTransport.STATUS_CONNECTED_TO:
				request.AddLog("STATUS_CONNECTED_TO" + " (timestamp: " + timestamp + ")");
				break;
			case nsISocketTransport.STATUS_SENDING_TO:
				request.AddLog("STATUS_SENDING_TO" + " (timestamp: " + timestamp + ")" + " (extraSizeData: " + extraSizeData + ")");
				break;
			case nsISocketTransport.STATUS_WAITING_FOR:
				request.AddLog("STATUS_WAITING_FOR" + " (timestamp: " + timestamp + ")");
				break;
			case nsISocketTransport.STATUS_RECEIVING_FROM:
				request.AddLog("STATUS_RECEIVING_FROM" + " (timestamp: " + timestamp + ")" + " (extraSizeData" + extraSizeData + ")");
				break;
		}
	},

	onModifyRequest: function (httpChannel, originalCallback)
	{
		// new request
		var request = new HttpFoxRequest(this.RequestStore, this.Service);
		
		// request status. new.
		this.RequestStore.addNewRequest(request);
				
		// assign HttpChannel to request
		request.HttpChannel = httpChannel;
		request.OriginalCallback = originalCallback;
		
		// get request infos
		this.getRequestInfos(request);

		// set start time
		request.Timestamp_StartJs = HFU.now();

		// log
		request.AddLog("onModifyRequest");

		// update GUI (event...)
		this.Service.requestAdded(request);
	},

	onExamineResponse: function (httpChannel)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }

		// log
		request.AddLog("onExamineResponse (status: " + request.HttpChannel.status + ")");

		// response headers arrived
		request.HasReceivedResponseHeaders = true;
		//request.Timestamp_ResponseStartedJs = HFU.now();
		
		// get response & request infos		
		this.getResponseInfos(request);

		// attach response listener
		if (this.isStreamListenerNeeded(request))
		{
			this.attachStreamListener(request, httpChannel);
		}
		else
		{
			request.Timestamp_EndJs = HFU.now();
			// if from cache > complete
			request.finishIfReady();
		}

		// update GUI (event...)
		this.Service.requestUpdated(request);
	},

	onExamineCachedResponse: function (httpChannel)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }
		
		// log
		request.AddLog("onExamineCachedResponse (status: " + request.HttpChannel.status + ")");

		// response headers arrived
		request.HasReceivedResponseHeaders = true;
		
		// request is served from cache
		request.IsFromCache = true;

		// enough for cached request
		request.Timestamp_EndJs = HFU.now();
		
		// if from cache > complete
		request.finishIfReady();
		
		// get response & request infos
		this.getResponseInfos(request);

		if (this.isStreamListenerNeeded(request))
		{
			this.attachStreamListener(request, httpChannel);
		}
		else
		{
			// if from cache > complete
			request.finishIfReady();
		}

		// update GUI (event...)
		this.Service.requestUpdated(request);
	},
	/************************************************************************************/
	
	// response streamlistener event
	onResponseStart: function (request, context)
	{
		request.AddLog("onResponseStart (context: " + context);
		// update content infos. could be different when dealing with 304
		this.getResponseContentInfos(request);
		
		// update GUI (event...)
		//this.Service.requestUpdated(request);
	},

	// response streamlistener event
	onResponseStop: function (request, context, statusCode)
	{
		request.AddLog("onResponseStop (" + statusCode + ") " + " (status: " + request.HttpChannel.status + ")");
		if (request.Timestamp_EndJs == null)
		{
			request.Timestamp_EndJs = HFU.now();
		} 
		request.IsResponseStopped = true;
		request.finishIfReady();
		
		// update GUI (event...)
		this.Service.requestUpdated(request);
	},

	// response streamlistener event
	onResponseDataAvailable: function (request, context, inputStream, offset, count)
	{
		request.AddLog("onResponseDataAvailable (context: " + context + ") (offset: " + offset + ") (count: " + count + ")");
		var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
		var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);
		var storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci.nsIStorageStream);

		binaryInputStream.setInputStream(inputStream);
		storageStream.init(8192, count, null);
		binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

		// Copy received data and write to new stream.
		var data = binaryInputStream.readBytes(count);
		request.ContentData.push(data);
		binaryOutputStream.writeBytes(data, count);
		request.ContentText += data;

		// size
		request.ContentSize += count;

		// update GUI (event...)
		this.Service.requestUpdated(request);
		
		// return stream to be forwarded to other listeners
		return storageStream;
	},
	/************************************************************************************/
	
	// eventsink event
	onEventSinkProgress: function(httpChannel, progress, progressMax)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }

		// update size values
		if ((progressMax != null && progressMax != -1) &&
			((request.ContentSizeFromNetMax == null) ||
			(request.ContentSizeFromNetMax != progressMax)))
		{
			request.ContentSizeFromNetMax = progressMax;
		}

		request.ContentSizeFromNet = progress;
		
		request.AddLog("onEventSinkProgress (progress: " + progress + ") (progressMax: " + progressMax + ")");
		
		// update GUI (event...)
		this.Service.requestUpdated(request);
	},

	// eventsink event
	onEventSinkStatus: function(httpChannel, status, statusArg)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }

		request.AddLog("onEventSinkStatus (status: " + status + ") (statusArg: " + statusArg + ")");
		
		// update GUI (event...)
		//this.Service.requestUpdated(request);
	},
	
	onAsyncChannelRedirect: function(oldChannel, newChannel, flags, callback)
	{
		var request = this.getMatchingRequest(oldChannel);
		if (!request) { return; }

		request.AddLog("onAsyncChannelRedirect (oldChannel: " + oldChannel.URI.asciiSpec 
			+ ") (newChannel: " + newChannel.URI.asciiSpec + ") (flags: " + flags + ")");
		
		// update GUI (event...)
		//this.Service.requestUpdated(request);
	},
	/************************************************************************************/

	// helpers
	getMatchingRequest: function(httpChannel)
	{
		var request = this.RequestStore.getMatchingRequest(httpChannel);
		if (request == null) 
		{
			dump("no matching request found (" + httpChannel.URI.asciiSpec + ")\n");
			if (arguments.length > 1) {dump("--: " + httpChannel + "\n"); }
			return null;
		}
		//if (arguments.length > 1) { dump("! matching request found (" + httpChannel.URI.asciiSpec + ") " + httpChannel + "\n"); }
		return request;
	},

	isStreamListenerNeeded: function(request)
	{
		// TODO: setting with list of codes to stop further processing (listening to response content) 303?
		// TODO: OR listen to channelredirect events
		// TODO: define which mimetypes to capture here as well? per config option?
		// TODO: body size?
		if (request.RequestMethod == "HEAD")
		{
			request.HasContent = false;
			return false;
		}
		
		if (this.isRedirectResponse(request)) 
		{
			request.HasContent = false;
			return false;
		}

		return true;
	},
	
	isRedirectResponse: function (request)
	{
		if (request.ResponseStatus == 302 || 
			request.ResponseStatus == 301 || 
			request.ResponseStatus == 303 ||
			request.ResponseStatus == 305 ||
			request.ResponseStatus == 307)
		{
			request.IsRedirected = true;
			return true;
		}

		return false;
	},

	attachStreamListener: function(request, httpChannel)
	{
		// attach response stream listener if wanted
		var streamListener = new HttpFoxResponseStreamListener(this);
		httpChannel.QueryInterface(Ci.nsITraceableChannel);
		streamListener.OriginalListener = httpChannel.setNewListener(streamListener);
		streamListener.Request = request;
		request.ResponseStreamListener = streamListener;
	},

	// processors
	getRequestInfos: function (request)
	{
		// channel infos
		request.Url = request.HttpChannel.URI ? this.getFinalUrl(request.HttpChannel.URI.asciiSpec) : null;
		request.URIScheme = request.HttpChannel.URI ? request.HttpChannel.URI.scheme : null;
		request.URIPath = request.HttpChannel.URI ? this.getFinalUrl(request.HttpChannel.URI.path) : null;
		request.RequestMethod = request.HttpChannel.requestMethod;
		request.IsBackground = request.HttpChannel.loadFlags ? (request.HttpChannel.loadFlags & Ci.nsIRequest.LOAD_BACKGROUND ? true : false) : false;
		request.AddLog("IsBackground: " + request.IsBackground);

		// Get Request Headers
		var dummyHeaderInfo = new HttpFoxHeaderInfo();
		request.HttpChannel.visitRequestHeaders(dummyHeaderInfo);
		request.RequestHeaders = dummyHeaderInfo.Headers;

		// Get QueryString if there.
		this.getQueryString(request);

		// Get Cookie Sent Infos
		this.getCookiesSent(request);

		// Get post data if there.
		this.getPostData(request);

		// Get request protocol version
		this.getRequestProtocolVersion(request);
	},

	getFinalUrl: function(channelUri)
	{
		return channelUri.split("#")[0];
	},

	getResponseInfos: function (request)
	{
		this.getResponseContentInfos(request);
		
		try { request.RequestSucceeded = request.HttpChannel.requestSucceeded; } catch (ex) { }
		try { request.ResponseStatus = request.HttpChannel.responseStatus; } catch (ex) { }
		try { request.ResponseStatusText = request.HttpChannel.responseStatusText; } catch (ex) { }
		try { request.EntityId = request.HttpChannel.entityId; } catch (ex) { }
		try { request.IsFromCache = request.HttpChannel.isFromCache(); } catch (ex) { }

		// ok. received a server response.
		// Get Request Headers again. maybe be changed after us. (e.g. cache-control)
		var dummyHeaderInfo;
		dummyHeaderInfo = new HttpFoxHeaderInfo();
		request.HttpChannel.visitRequestHeaders(dummyHeaderInfo);
		request.RequestHeaders = dummyHeaderInfo.Headers;

		// Get Response Headers
		dummyHeaderInfo = new HttpFoxHeaderInfo();
		request.HttpChannel.visitResponseHeaders(dummyHeaderInfo);
		request.ResponseHeaders = dummyHeaderInfo.Headers;

		// check if redirect
		this.isRedirectResponse(request);
		
		// Get Cookies Received Infos
		this.getCookiesReceived(request);
					
		// Get response protocol version
		this.getResponseProtocolVersion(request);
	},

	getResponseContentInfos: function (request)
	{
		try { request.ContentType = request.HttpChannel.contentType; } catch (ex) { }
		try { request.ContentCharset = request.HttpChannel.contentCharset; } catch (ex) { }
		try { request.ContentLength = request.HttpChannel.contentLength; } catch (ex) { }
		if (request.ContentLength != null)
		{
			request.ContentSizeFromNetMax = request.ContentLength;
		}
	},
	
	getRequestProtocolVersion: function (request)
	{
		try
		{
			var httpChannelInternal = request.HttpChannel.QueryInterface(Ci.nsIHttpChannelInternal);
			var ver1 = new Object;
			var ver2 = new Object;
			httpChannelInternal.getRequestVersion(ver1, ver2);
			request.RequestProtocolVersion = ver1.value + "." + ver2.value;
		}
		catch (ex)
		{
			return;
		}
	},

	getResponseProtocolVersion: function (request)
	{
		try
		{
			var httpChannelInternal = request.HttpChannel.QueryInterface(Ci.nsIHttpChannelInternal);
			var ver1 = new Object;
			var ver2 = new Object;
			httpChannelInternal.getResponseVersion(ver1, ver2);
			request.ResponseProtocolVersion = ver1.value + "." + ver2.value;
		}
		catch (ex)
		{
			return;
		}
	},

	getPostData: function (request)
	{
		// Get the postData stream from the Http Object 
		try
		{
			// Must change HttpChannel to UploadChannel to be able to access post data
			var postChannel = request.HttpChannel.QueryInterface(Ci.nsIUploadChannel);

			// Get the post data stream
			if (postChannel.uploadStream)
			{
				//this.PostDataChannel = postChannel;
				var postDataHandler = new HttpFoxPostDataHandler(request);
				postDataHandler.getPostData();
			}
		}
		catch (ex)
		{
			dump("Getting POST data exception: " + ex);
		}
	},

	getQueryString: function (request)
	{
		if (request.Url.indexOf("?") == -1)
		{
			request.QueryString = "";
			return;
		}

		request.QueryString = request.Url.slice(request.Url.indexOf("?") + 1, request.Url.length);

		request.QueryStringParameters = new Array();
		var queryStringParts = request.QueryString.split("&");
		for (i in queryStringParts)
		{
			var nvName = queryStringParts[i].slice(0, queryStringParts[i].indexOf("=") != -1 ? queryStringParts[i].indexOf("=") : queryStringParts[i].length);
			var nvValue = (queryStringParts[i].indexOf("=") != -1) ? queryStringParts[i].slice(queryStringParts[i].indexOf("=") + 1, queryStringParts[i].length) : "";
			request.QueryStringParameters.push([nvName, nvValue]);
		}
	},

	getCookiesSent: function (request)
	{
		request.CookiesSent = new Array();

		var cookiesStored = HFU.getStoredCookies(request.RequestHeaders["Host"], request.URIPath);

		if (request.RequestHeaders["Cookie"])
		{
			var requestCookies = request.RequestHeaders["Cookie"].split("; ");
			for (i in requestCookies)
			{
				var cName = requestCookies[i].slice(0, requestCookies[i].indexOf("="));
				var cValue = requestCookies[i].slice(cName.length + 1);

				var cookieData = new Array();
				cookieData["name"] = cName;
				cookieData["value"] = cValue;

				for (var i = 0; i < cookiesStored.length; i++)
				{
					if (cookiesStored[i].name == cName && cookiesStored[i].value == cValue)
					{
						cookieData["domain"] = cookiesStored[i].host;
						cookieData["expires"] = cookiesStored[i].expires;
						cookieData["path"] = cookiesStored[i].path;
						cookiesStored.splice(i, 1);
						break;
					}
				}

				request.CookiesSent.push(cookieData);
			}
		}
	},

	getCookiesReceived: function (request)
	{
		request.CookiesReceived = new Array();

		if (request.ResponseHeaders["Set-Cookie"])
		{
			var responseCookies = request.ResponseHeaders["Set-Cookie"].split("\n");
			for (i in responseCookies)
			{
				var dataSections = responseCookies[i].split(";");
				var cName = dataSections[0].slice(0, dataSections[0].indexOf("="));
				var cValue = dataSections[0].slice(cName.length + 1);
				var cookieData = new Array();
				cookieData["name"] = HFU.trim(cName, 'left');
				cookieData["value"] = cValue;

				// other infos
				for (var u = 1; dataSections[u] != null; u++)
				{
					var cInfoName = dataSections[u].slice(1, dataSections[u].indexOf("="));
					var cInfoValue = dataSections[u].slice(cInfoName.length + 2);
					cookieData[cInfoName.toLowerCase()] = cInfoValue;
				}

				if (!cookieData["domain"])
				{
					cookieData["domain"] = request.RequestHeaders["Host"];
				}

				if (!cookieData["path"])
				{
					cookieData["path"] = "/";
				}

				// check against stored one
				var cookiesStored = HFU.getStoredCookies(cookieData["domain"], cookieData["path"]);
				for (var i = 0; i < cookiesStored.length; i++)
				{
					if (cookiesStored[i].name == cName && cookiesStored[i].value == cValue && cookiesStored[i].path == cookieData["path"])
					{
						/*if (cookieData["expires"])
						{
						cookieData["expires"] = cookiesStored[i].expires;	
						}*/

						cookiesStored.splice(i, 1);
						break;
					}
				}

				request.CookiesReceived.push(cookieData);
			}
		}
	}

};