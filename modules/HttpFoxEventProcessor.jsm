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
			// only some events
			//if (activitySubType != Ci.nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE)
			//{
				request = this.getMatchingRequest(httpChannel);
				if (!request) { return; }
			
				this.onHttpActivity(request, activitySubType, timestamp, extraSizeData, extraStringData);
			//}
		}
		else 
		{
			// only some events
			if (activitySubType == Ci.nsISocketTransport.STATUS_SENDING_TO) 
			{
				request = this.getMatchingRequest(httpChannel);
				if (!request) { return; }

				this.onSocketActivity(request, activitySubType, timestamp, extraSizeData, extraStringData);
			}
		}
	},

	onHttpActivity: function (request, activitySubType, timestamp, extraSizeData, extraStringData)
	{
		var nsIHttpActivityObserver = Ci.nsIHttpActivityObserver;
		timestamp /= 1000;
		switch (activitySubType)
		{
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_HEADER:
				// The HTTP request is about to be queued for sending. Observers can look at request headers in aExtraStringData
				request.Timestamp_StartNet = timestamp;
				request.AddLog("ACTIVITY_SUBTYPE_REQUEST_HEADER" + " (timestamp: " + timestamp + ")");
				break;
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT:
				// The HTTP request's body has been sent.
				request.Timestamp_PostSent = timestamp;
				request.AddLog("ACTIVITY_SUBTYPE_REQUEST_BODY_SENT" + " (timestamp: " + timestamp + ")");
				break;
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_START:
				// The HTTP response has started to arrive.
				request.Timestamp_ResponseStartedNet = timestamp;
				request.AddLog("ACTIVITY_SUBTYPE_RESPONSE_START" + " (timestamp: " + timestamp + ")");
				break;
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_HEADER:
				// The HTTP response header has arrived.
				request.AddLog("ACTIVITY_SUBTYPE_RESPONSE_HEADER" + " (timestamp: " + timestamp + ")");
				break;
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE:
				// The complete HTTP response has been received.
				request.AddLog("ACTIVITY_SUBTYPE_RESPONSE_COMPLETE" + " (timestamp: " + timestamp + ")" + " (extraSizeData: " + extraSizeData + ")");
				break;
			case nsIHttpActivityObserver.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE:
				// 	The HTTP transaction has been closed.
				request.Timestamp_EndNet = timestamp;
				request.AddLog("ACTIVITY_SUBTYPE_TRANSACTION_CLOSE" + " (timestamp: " + timestamp + ")" + " (httpChannelStatus: " + request.HttpChannel.status + ")");

				if (request.isHttpChannelAborted())
				{
					// aborted
					request.setAborted(timestamp);
				}
				else if (request.isHttpChannelRedirected())
				{
					// redirected
					request.setRedirected(timestamp);
				}

				// check if complete
				request.completeIfReady();
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

	onModifyRequest: function (httpChannel)
	{
		// new request
		var request = new HttpFoxRequest(this.RequestStore, this.Service);
		
		// request status. new.
		this.RequestStore.addNewRequest(request);
				
		// assign HttpChannel to request
		request.HttpChannel = httpChannel;
		
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
		request.Timestamp_ResponseStartedJs = HFU.now();
		
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
			request.completeIfReady();
		}

		// update GUI (event...)
		this.Service.requestUpdated();
	},

	onExamineCachedResponse: function (httpChannel)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }
		
		// log
		request.AddLog("onExamineCachedResponse (status: " + request.HttpChannel.status + ")");

		// response headers arrived
		request.HasReceivedResponseHeaders = true;
		request.Timestamp_ResponseStartedJs = HFU.now();
		
		// request is served from cache
		request.IsFromCache = true;
		
		// get response & request infos
		this.getResponseInfos(request);

		if (this.isStreamListenerNeeded(request))
		{
			this.attachStreamListener(request, httpChannel);
		}
		else
		{
			request.Timestamp_EndJs = HFU.now();
			// if from cache > complete
			request.completeIfReady();
		}

		// update GUI (event...)
		this.Service.requestUpdated();
	},
	/************************************************************************************/
	
	// response streamlistener event
	onResponseStart: function (request, context)
	{
		request.AddLog("onResponseStart");
		
		// update GUI (event...)
		this.Service.requestUpdated();
	},

	// response streamlistener event
	onResponseStop: function (request, context, statusCode)
	{
		request.AddLog("onResponseStop (" + statusCode + ") " + " (status: " + request.HttpChannel.status + ")");

		request.Timestamp_EndJs = HFU.now();

		request.completeIfReady();
		
		// update GUI (event...)
		this.Service.requestUpdated();
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
		request.ResponseData.push(data);
		binaryOutputStream.writeBytes(data, count);
		request.ResponseText += data;

		// size
		request.ResponseSize += count;

		// update GUI (event...)
		this.Service.requestUpdated();
		
		// return stream to be forwarded to other listeners
		return storageStream;
	},
	/************************************************************************************/
	
	// eventsink event
	onEventSinkProgress: function(httpChannel, progress, progressMax)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }

		request.AddLog("onEventSinkProgress (progres: " + progress + ") (progressMax: " + progressMax + ")");
		
		// update GUI (event...)
		//this.Service.requestUpdated();
	},

	// eventsink event
	onEventSinkStatus: function(httpChannel, status, statusArg)
	{
		var request = this.getMatchingRequest(httpChannel);
		if (!request) { return; }

		request.AddLog("onEventSinkStatus (status: " + status + ") (statusArg: " + statusArg + ")");
		
		// update GUI (event...)
		//this.Service.requestUpdated();
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
		if (request.ResponseStatus == 302 || request.ResponseStatus == 301 || request.ResponseStatus == 303)
		{
			return false;
		}

		return true;
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

		request.StartTimestamp = (new Date()).getTime();

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
		try { request.ContentType = request.HttpChannel.contentType; } catch (ex) { }
		try { request.ContentCharset = request.HttpChannel.ContentCharset; } catch (ex) { }
		try { request.ContentLength = request.HttpChannel.contentLength; } catch (ex) { }
		try { request.RequestSucceeded = request.HttpChannel.requestSucceeded; } catch (ex) { }
		try { request.ResponseStatus = request.HttpChannel.responseStatus; } catch (ex) { }
		try { request.ResponseStatusText = request.HttpChannel.responseStatusText; } catch (ex) { }
		try { request.EntityId = request.HttpChannel.EntityId; } catch (ex) { }
		try { request.IsFromCache = request.HttpChannel.isFromCache(); } catch (ex) { }

		// ok. received a server response.
		// Get Request Headers again. maybe be changed after us. (e.g. cache-control)
		var dummyHeaderInfo = new HttpFoxHeaderInfo();
		request.HttpChannel.visitRequestHeaders(dummyHeaderInfo);
		request.RequestHeaders = dummyHeaderInfo.Headers;

		// Get Response Headers
		var dummyHeaderInfo = new HttpFoxHeaderInfo();
		request.HttpChannel.visitResponseHeaders(dummyHeaderInfo);
		request.ResponseHeaders = dummyHeaderInfo.Headers;
					
		// Get Cookies Received Infos
		this.getCookiesReceived(request);
					
		// Get response protocol version
		this.getResponseProtocolVersion(request);
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