/*
	HttpFox - An HTTP analyzer addon for Firefox
	Copyright (C) 2008 Martin Theimer
	
	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
*/

// Date and Time stuff
function formatTimeDifference(startTime, endTime)
{
	if (startTime == null || endTime == null)
	{
		return "*";
	}
	
	// values ok
	var diff = endTime - startTime;
	
	var string = "";
	string += diff / 1000;
	var dummy = string.split(".");
	while (dummy[1].length < 3) dummy[1] += "0";
	var after = (dummy[1]) ? dummy[1] : "000";
	return dummy[0] + "." + after;
}

function dateFromUnixTimestamp(timestamp)
{
	return new Date(timestamp * 1000);
}

function formatDateTime(myDate)
{
	if (myDate instanceof Date) 
	{
		return myDate.toLocaleString();	
	}
	else 
	{
		return formatDateTime(dateFromUnixTimestamp(myDate));
	}
}

function formatTime(time)
{
	var h = (time - (time % 3600000)) / 3600000;
	time = time - (h * 3600000);

	var m = (time - (time % 60000)) / 60000;
	time = time - (m * 60000);

	var s = (time - (time % 1000)) / 1000;
	time = time - (s * 1000);

	var ms = time;
	
	var string = "";
	
	string += lZero(h);
	string += ":" + lZero(m);
	string += ":" + lZero(s);
	string += "." + pad(ms, 3);
	
	return string;
}

function lZero(x) 
{	
	// after Dietmar Meier
	return (-x > -10 && x >= 0 && "0" || "") + x;
}

function pad(val, len)
{
	val = String(val);
	len = len || 2;
	while (val.length < len) val = "0" + val;
	return val;
}

// size functions
function humanizeSize(size, displayUntil)
{
	var hsize = size;
	var hchar = "";
	var dotPos = -1;
	if (displayUntil == "undefined") 
	{
		displayUntil = 3;
	}
	
	if (size > 1073741824 && displayUntil <= 9)
	{
		hsize = size / 1073741824;
		hchar = "G";
	}
	
	if (size > 1048576 && displayUntil <= 6)
	{
		hsize = size / 1048576;
		hchar = "M";
	}
	
	if (size > 1024 && displayUntil <= 3)
	{
		hsize = size / 1024;
		hchar = "k";
	}
	
	hsize = hsize.toString();
	
	if ((dotPos = hsize.indexOf(".")) != -1)
	{
		hsize = hsize.substring(0, dotPos + 2);
	}
	
	return hsize + hchar;
}

// Utility function, dump an object by reflexion up to niv level
function dumpall(name, obj, niv) 
{
	if (!niv) {
		niv=1;
	}
	var dumpdict = new Object();

	dump ("\n\n-------------------------------------------------------\n");
	dump ("Dump of the object: " + name + " (" + niv + " levels)\n");
	dump ("Address: " + obj + "\n");
	dump ("Interfaces: ");
	
	for (var i in Components.interfaces) 
	{
		try 
		{
			obj.QueryInterface(Components.interfaces[i]);
			dump("" + Components.interfaces[i] + ", ");
		} 
		catch(ex) 
		{}
	}
	dump("\n");
	_dumpall(dumpdict,obj,niv,"","");
	dump ("\n\n-------------------------------------------------------\n\n");

	for (i in dumpdict) 
	{
		delete dumpdict[i];
	}
}

function _dumpall(dumpdict, obj, niv, tab, path) 
{
	if (obj in dumpdict) 
	{
		dump(" (Already dumped)");
	} 
	else 
	{
		dumpdict[obj]=1;
		
		var i, r, str, typ;
		for (i in obj) 
		{
			try 
			{
				str = String(obj[i]).replace(/\n/g, "\n" + tab);
			} 
			catch(ex) 
			{
				str = String(ex);
			}
			try 
			{
				typ = "" + typeof(obj[i]);
			} 
			catch(ex) 
			{
				typ = "unknown";
			}
			dump ("\n" + tab + i + " (" + typ + (path ? ", " + path : "") + "): " + str);
			if ((niv > 1) && (typ == "object")) 
			{
				_dumpall(dumpdict, obj[i], niv-1, tab + "\t", (path ? path + "->" + i : i));
			}
		}
	}
}
// ************************************************************************************************

function stripNewlines(text)
{
	return text.replace(/(\r\n|\r|\n)/, "");
}

function isXml(text)
{
	if (text.match(/<\?xml[^\?>]*\?>/i))
	{
		// xml header found
		return true;
	}
	
	return stripNewlines(text).match(/<([^> ]+)( [^>]+)*>.*<\/\1>|<[^>]+\/>/i);
}

function isContentTypeXml(typestring)
{
	if (typestring.indexOf("xml") != -1) 
	{
		return true;
	}
	
	if (typestring.indexOf("rdf") != -1) 
	{
		return true;
	}
	
	if (typestring.indexOf("dtd") != -1) 
	{
		return true;
	}
	
	return false;
}

// from live http headers:
// Utility function to save data to clipboard
function toClipboard(data)
{
	if (data) 
	{
		// clipboard helper
		try
		{
			const clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
			clipboardHelper.copyString(data);
		} 
		catch(ex) 
		{
      		// do nothing, later code will handle the error
		    dump("Unable to get the clipboard helper\n");
    	}
  	}
}

// Utility function to save data to a file
/*function saveAs(data, title)
{
	if (!title) title = "LiveHTTPHeaders";
	const MODE =  0x2A; // MODE_WRONLY | MODE_CREATE | MODE_TRUNCAT
	const PERM = 00644; // PERM_IRUSR | PERM_IWUSR | PERM_IRGRP | PERM_IROTH
	const PICKER_CTRID = "@mozilla.org/filepicker;1";
	const FILEOUT_CTRID = "@mozilla.org/network/file-output-stream;1";
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	const nsIFileOutputStream = Components.interfaces.nsIFileOutputStream;

	try 
	{
		var picker = Components.classes[PICKER_CTRID].createInstance(nsIFilePicker);
		picker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
		picker.init (window, title, Components.interfaces.nsIFilePicker.modeSave);
		var rv = picker.show();

		if (rv != Components.interfaces.nsIFilePicker.returnCancel) 
		{
			var os = Components.classes[FILEOUT_CTRID].createInstance(nsIFileOutputStream);
			os.init(picker.file, MODE, PERM, 0);
			os.write(data, data.length);
		}
	} 
	catch(ex)
	{
		alert(ex);
	}
}*/
// ************************************************************************************************

// context
function getContextFromWindow(win)
{
	if (win == null) 
	{
		return new HttpFoxContext(null, null, null, false);
	}
	else 
	{
		var browser = this.getBrowserByWindow(win);
		var chrome = browser ? browser.chrome : null;
		return new HttpFoxContext(win, browser, chrome, false);	
	}
}

function getContextFromRequest(request)
{
	var win = null;
	var browser = null;
	
	try 
	{
		request.QueryInterface(Components.interfaces.nsIChannel);
	}
	catch(ex)
	{
		return new HttpFoxContext(null, null, null, false);
	}
	
	if (request.loadGroup == null) 
	{
		win = null;
		var tabBrowser = document.getElementById("content");
		return new HttpFoxContext(null, null, null, false);
	}
	
	var go = request.loadGroup.groupObserver;
	if (go == null)
	{
		dumpall("j", request.loadGroup);
	}
	go.QueryInterface(Components.interfaces.nsIWebProgress);
	win = go.DOMWindow;
	browser = this.getBrowserByWindow(win);
	var chrome = browser ? browser.chrome : null;
	return new HttpFoxContext(win, browser, chrome, false);	
}

function getBrowserByWindow(win)
{
	return null;
	// DUMMY
	var tabBrowser = document.getElementById("content");
	
	for (var i = 0; i < tabBrowser.browsers.length; ++i)
	{
		var browser = tabBrowser.browsers[i];
		if (browser.contentWindow == win)
		{
			return browser;
		}
	}
	return null;
}
// ************************************************************************************************

function getCacheKey(context)
{
	try
	{
		var webNav = context.browser.webNavigation;
		var descriptor = QI(webNav, CI("nsIWebPageDescriptor")).currentDescriptor;
		var entry = QI(descriptor, CI("nsISHEntry"));
		return entry.cacheKey;
	}
	catch(ex)
	{}
	
	return null;
}
// ************************************************************************************************

// Constants (from firebug)
const nsIIOService = CI("nsIIOService");
const nsIRequest = CI("nsIRequest");
const nsIChannel = CI("nsIChannel");
const nsICachingChannel = CI("nsICachingChannel");
const nsIScriptableInputStream = CI("nsIScriptableInputStream");
const nsIUploadChannel = CI("nsIUploadChannel");
const IOService = CC("@mozilla.org/network/io-service;1");
const ScriptableInputStream = CC("@mozilla.org/scriptableinputstream;1");
// ************************************************************************************************
// XPCOM Utilities
//var _CI = Components.interfaces;
//var _CC = Components.classes;
function CC(cName)
{
	var _CC = Components.classes;
    return _CC[cName];
}

function CI(ifaceName)
{
	var _CI = Components.interfaces;
    return _CI[ifaceName];
}

function CCSV(cName, ifaceName)
{
	var _CC = Components.classes;
	var _CI = Components.interfaces;
    return _CC[cName].getService(_CI[ifaceName]);        
}

function CCIN(cName, ifaceName)
{
	var _CC = Components.classes;
	var _CI = Components.interfaces;
    return _CC[cName].createInstance(_CI[ifaceName]);
}

function QI(obj, iface)
{
    return obj.QueryInterface(iface);
}
// ************************************************************************************************

function openWindow(windowType, url, features, params)
{
    var wm = CCSV("@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator");

    var win = windowType ? wm.getMostRecentWindow(windowType) : null;
    if (win) 
	{
		if ("initWithParams" in win)
		{
			win.initWithParams(aParams);
		}
		win.focus();
    }
    else 
    {
		var winFeatures = "resizable,dialog=no,centerscreen" + (features != "" ? ("," + features) : "");
		var parentWindow = (!window.opener || window.opener.closed) ? window : window.opener;
		win = parentWindow.openDialog(url, "_blank", winFeatures, params);
	}
	return win;
};

function $(id, doc)
{
    if (doc)
        return doc.getElementById(id);
    else
        return document.getElementById(id);
}

function urlDecode(value)
{
	var decoded = value.replace(/\+/g, " ");
	decoded = unescape(decoded);
	
	return decoded;
}

function $STR(name)
{
    return document.getElementById("strings_httpfox").getString(name);
}

function $STRF(name, args)
{
    return document.getElementById("strings_httpfox").getFormattedString(name, args);
}

// ************************************************************************************************

var nsResultErrors = new Object();
nsResultErrors["c1f30000"] = "NS_ERROR_BASE";
nsResultErrors["80004001"] = "NS_ERROR_NOT_IMPLEMENTED";
nsResultErrors["80004003"] = "NS_ERROR_INVALID_POINTER";
nsResultErrors["80004004"] = "NS_ERROR_ABORT";
nsResultErrors["80004005"] = "NS_ERROR_FAILURE";
nsResultErrors["8000ffff"] = "NS_ERROR_UNEXPECTED";
nsResultErrors["80010010"] = "NS_ERROR_PROXY_INVALID_IN_PARAMETER";
nsResultErrors["80010011"] = "NS_ERROR_PROXY_INVALID_OUT_PARAMETER";
nsResultErrors["80040110"] = "NS_ERROR_NO_AGGREGATION";
nsResultErrors["80040111"] = "NS_ERROR_NOT_AVAILABLE";
nsResultErrors["80040154"] = "NS_ERROR_FACTORY_NOT_REGISTERED";
nsResultErrors["80040155"] = "NS_ERROR_FACTORY_REGISTER_AGAIN";
nsResultErrors["800401f8"] = "NS_ERROR_FACTORY_NOT_LOADED";
nsResultErrors["8007000e"] = "NS_ERROR_OUT_OF_MEMORY";
nsResultErrors["80070057"] = "NS_ERROR_ILLEGAL_VALUE";
nsResultErrors["80460001"] = "NS_ERROR_CANNOT_CONVERT_DATA";
nsResultErrors["80460002"] = "NS_ERROR_OBJECT_IS_IMMUTABLE";
nsResultErrors["80460003"] = "NS_ERROR_LOSS_OF_SIGNIFICANT_DATA";
nsResultErrors["80460016"] = "NS_ERROR_SERVICE_NOT_AVAILABLE";
nsResultErrors["80460018"] = "NS_ERROR_IS_DIR";
nsResultErrors["8046001e"] = "NS_ERROR_ILLEGAL_DURING_SHUTDOWN";
nsResultErrors["80470002"] = "NS_BASE_STREAM_CLOSED";
nsResultErrors["80470003"] = "NS_BASE_STREAM_OSERROR";
nsResultErrors["80470004"] = "NS_BASE_STREAM_ILLEGAL_ARGS";
nsResultErrors["80470005"] = "NS_BASE_STREAM_NO_CONVERTER";
nsResultErrors["80470006"] = "NS_BASE_STREAM_BAD_CONVERSION";
nsResultErrors["80470007"] = "NS_BASE_STREAM_WOULD_BLOCK";
nsResultErrors["80480002"] = "NS_ERROR_GFX_PRINTER_CMD_NOT_FOUND";
nsResultErrors["80480003"] = "NS_ERROR_GFX_PRINTER_CMD_FAILURE";
nsResultErrors["80480004"] = "NS_ERROR_GFX_PRINTER_NO_PRINTER_AVAILABLE";
nsResultErrors["80480005"] = "NS_ERROR_GFX_PRINTER_NAME_NOT_FOUND";
nsResultErrors["80480006"] = "NS_ERROR_GFX_PRINTER_ACCESS_DENIED";
nsResultErrors["80480007"] = "NS_ERROR_GFX_PRINTER_INVALID_ATTRIBUTE";
nsResultErrors["80480009"] = "NS_ERROR_GFX_PRINTER_PRINTER_NOT_READY";
nsResultErrors["8048000a"] = "NS_ERROR_GFX_PRINTER_OUT_OF_PAPER";
nsResultErrors["8048000b"] = "NS_ERROR_GFX_PRINTER_PRINTER_IO_ERROR";
nsResultErrors["8048000c"] = "NS_ERROR_GFX_PRINTER_COULD_NOT_OPEN_FILE";
nsResultErrors["8048000d"] = "NS_ERROR_GFX_PRINTER_FILE_IO_ERROR";
nsResultErrors["8048000e"] = "NS_ERROR_GFX_PRINTER_PRINTPREVIEW";
nsResultErrors["8048000f"] = "NS_ERROR_GFX_PRINTER_STARTDOC";
nsResultErrors["80480010"] = "NS_ERROR_GFX_PRINTER_ENDDOC";
nsResultErrors["80480011"] = "NS_ERROR_GFX_PRINTER_STARTPAGE";
nsResultErrors["80480012"] = "NS_ERROR_GFX_PRINTER_ENDPAGE";
nsResultErrors["80480013"] = "NS_ERROR_GFX_PRINTER_PRINT_WHILE_PREVIEW";
nsResultErrors["80480014"] = "NS_ERROR_GFX_PRINTER_PAPER_SIZE_NOT_SUPPORTED";
nsResultErrors["80480015"] = "NS_ERROR_GFX_PRINTER_ORIENTATION_NOT_SUPPORTED";
nsResultErrors["80480016"] = "NS_ERROR_GFX_PRINTER_COLORSPACE_NOT_SUPPORTED";
nsResultErrors["80480017"] = "NS_ERROR_GFX_PRINTER_TOO_MANY_COPIES";
nsResultErrors["80480018"] = "NS_ERROR_GFX_PRINTER_DRIVER_CONFIGURATION_ERROR";
nsResultErrors["80480019"] = "NS_ERROR_GFX_PRINTER_DOC_IS_BUSY_PP";
nsResultErrors["8048001a"] = "NS_ERROR_GFX_PRINTER_DOC_WAS_DESTORYED";
nsResultErrors["8048001b"] = "NS_ERROR_GFX_PRINTER_NO_XUL";
nsResultErrors["8048001c"] = "NS_ERROR_GFX_NO_PRINTDIALOG_IN_TOOLKIT";
nsResultErrors["8048001d"] = "NS_ERROR_GFX_NO_PRINTROMPTSERVICE";
nsResultErrors["8048001e"] = "NS_ERROR_GFX_PRINTER_PLEX_NOT_SUPPORTED";
nsResultErrors["8048001f"] = "NS_ERROR_GFX_PRINTER_DOC_IS_BUSY";
nsResultErrors["80480020"] = "NS_ERROR_GFX_PRINTING_NOT_IMPLEMENTED";
nsResultErrors["80480021"] = "NS_ERROR_GFX_COULD_NOT_LOAD_PRINT_MODULE";
nsResultErrors["80480022"] = "NS_ERROR_GFX_PRINTER_RESOLUTION_NOT_SUPPORTED";
nsResultErrors["804b0001"] = "NS_BINDING_FAILED";
nsResultErrors["804b0002"] = "NS_BINDING_ABORTED";
nsResultErrors["804b0003"] = "NS_BINDING_REDIRECTED";
nsResultErrors["804b0004"] = "NS_BINDING_RETARGETED";
nsResultErrors["804b000a"] = "NS_ERROR_MALFORMED_URI";
nsResultErrors["804b000b"] = "NS_ERROR_ALREADY_CONNECTED";
nsResultErrors["804b000c"] = "NS_ERROR_NOT_CONNECTED";
nsResultErrors["804b000d"] = "NS_ERROR_CONNECTION_REFUSED";
nsResultErrors["804b000e"] = "NS_ERROR_NET_TIMEOUT";
nsResultErrors["804b000f"] = "NS_ERROR_IN_PROGRESS";
nsResultErrors["804b0010"] = "NS_ERROR_OFFLINE";
nsResultErrors["804b0011"] = "NS_ERROR_NO_CONTENT";
nsResultErrors["804b0012"] = "NS_ERROR_UNKNOWN_PROTOCOL";
nsResultErrors["804b0013"] = "NS_ERROR_PORT_ACCESS_NOT_ALLOWED";
nsResultErrors["804b0014"] = "NS_ERROR_NET_RESET";
nsResultErrors["804b0015"] = "NS_ERROR_FTP_LOGIN";
nsResultErrors["804b0016"] = "NS_ERROR_FTP_CWD";
nsResultErrors["804b0017"] = "NS_ERROR_FTP_PASV";
nsResultErrors["804b0018"] = "NS_ERROR_FTP_PWD";
nsResultErrors["804b0019"] = "NS_ERROR_NOT_RESUMABLE";
nsResultErrors["804b001b"] = "NS_ERROR_INVALID_CONTENT_ENCODING";
nsResultErrors["804b001c"] = "NS_ERROR_FTP_LIST";
nsResultErrors["804b001e"] = "NS_ERROR_UNKNOWN_HOST";
nsResultErrors["804b001f"] = "NS_ERROR_REDIRECT_LOOP";
nsResultErrors["804b0020"] = "NS_ERROR_ENTITY_CHANGED";
nsResultErrors["804b002a"] = "NS_ERROR_UNKNOWN_PROXY_HOST";
nsResultErrors["804b0033"] = "NS_ERROR_UNKNOWN_SOCKET_TYPE";
nsResultErrors["804b0034"] = "NS_ERROR_SOCKET_CREATE_FAILED";
nsResultErrors["804b003d"] = "NS_ERROR_CACHE_KEY_NOT_FOUND";
nsResultErrors["804b003e"] = "NS_ERROR_CACHE_DATA_IS_STREAM";
nsResultErrors["804b003f"] = "NS_ERROR_CACHE_DATA_IS_NOT_STREAM";
nsResultErrors["804b0040"] = "NS_ERROR_CACHE_WAIT_FOR_VALIDATION";
nsResultErrors["804b0041"] = "NS_ERROR_CACHE_ENTRY_DOOMED";
nsResultErrors["804b0042"] = "NS_ERROR_CACHE_READ_ACCESS_DENIED";
nsResultErrors["804b0043"] = "NS_ERROR_CACHE_WRITE_ACCESS_DENIED";
nsResultErrors["804b0044"] = "NS_ERROR_CACHE_IN_USE";
nsResultErrors["804b0046"] = "NS_ERROR_DOCUMENT_NOT_CACHED";
nsResultErrors["804b0047"] = "NS_ERROR_NET_INTERRUPT";
nsResultErrors["804b0048"] = "NS_ERROR_PROXY_CONNECTION_REFUSED";
nsResultErrors["804b0049"] = "NS_ERROR_ALREADY_OPENED";
nsResultErrors["804b004a"] = "NS_ERROR_UNSAFE_CONTENT_TYPE";
nsResultErrors["804b0050"] = "NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS";
nsResultErrors["804b0051"] = "NS_ERROR_HOST_IS_IP_ADDRESS";
nsResultErrors["804c03e8"] = "NS_ERROR_PLUGINS_PLUGINSNOTCHANGED";
nsResultErrors["804c03e9"] = "NS_ERROR_PLUGIN_DISABLED";
nsResultErrors["804c03ea"] = "NS_ERROR_PLUGIN_BLOCKLISTED";
nsResultErrors["804e03e8"] = "NS_ERROR_HTMLPARSER_EOF";
nsResultErrors["804e03e9"] = "NS_ERROR_HTMLPARSER_UNKNOWN";
nsResultErrors["804e03ea"] = "NS_ERROR_HTMLPARSER_CANTPROPAGATE";
nsResultErrors["804e03eb"] = "NS_ERROR_HTMLPARSER_CONTEXTMISMATCH";
nsResultErrors["804e03ec"] = "NS_ERROR_HTMLPARSER_BADFILENAME";
nsResultErrors["804e03ed"] = "NS_ERROR_HTMLPARSER_BADURL";
nsResultErrors["804e03ee"] = "NS_ERROR_HTMLPARSER_INVALIDPARSERCONTEXT";
nsResultErrors["804e03ef"] = "NS_ERROR_HTMLPARSER_INTERRUPTED";
nsResultErrors["804e03f0"] = "NS_ERROR_HTMLPARSER_BLOCK";
nsResultErrors["804e03f1"] = "NS_ERROR_HTMLPARSER_BADTOKENIZER";
nsResultErrors["804e03f2"] = "NS_ERROR_HTMLPARSER_BADATTRIBUTE";
nsResultErrors["804e03f3"] = "NS_ERROR_HTMLPARSER_UNRESOLVEDDTD";
nsResultErrors["804e03f4"] = "NS_ERROR_HTMLPARSER_MISPLACEDTABLECONTENT";
nsResultErrors["804e03f5"] = "NS_ERROR_HTMLPARSER_BADDTD";
nsResultErrors["804e03f6"] = "NS_ERROR_HTMLPARSER_BADCONTEXT";
nsResultErrors["804e03f7"] = "NS_ERROR_HTMLPARSER_STOPPARSING";
nsResultErrors["804e03f8"] = "NS_ERROR_HTMLPARSER_UNTERMINATEDSTRINGLITERAL";
nsResultErrors["804e03f9"] = "NS_ERROR_HTMLPARSER_HIERARCHYTOODEEP";
nsResultErrors["804e03fa"] = "NS_ERROR_HTMLPARSER_FAKE_ENDTAG";
nsResultErrors["804e03fb"] = "NS_ERROR_HTMLPARSER_INVALID_COMMENT";
nsResultErrors["80500001"] = "NS_ERROR_UCONV_NOCONV";
nsResultErrors["8050000e"] = "NS_ERROR_UDEC_ILLEGALINPUT";
nsResultErrors["8050000e"] = "NS_ERROR_ILLEGAL_INPUT";
nsResultErrors["80510001"] = "NS_ERROR_REG_BADTYPE";
nsResultErrors["80510001"] = "NS_ERROR_REG_BADTYPE";
nsResultErrors["80510003"] = "NS_ERROR_REG_NOT_FOUND";
nsResultErrors["80510003"] = "NS_ERROR_REG_NOT_FOUND";
nsResultErrors["80510004"] = "NS_ERROR_REG_NOFILE";
nsResultErrors["80510004"] = "NS_ERROR_REG_NOFILE";
nsResultErrors["80510005"] = "NS_ERROR_REG_BUFFER_TOO_SMALL";
nsResultErrors["80510005"] = "NS_ERROR_REG_BUFFER_TOO_SMALL";
nsResultErrors["80510006"] = "NS_ERROR_REG_NAME_TOO_LONG";
nsResultErrors["80510006"] = "NS_ERROR_REG_NAME_TOO_LONG";
nsResultErrors["80510007"] = "NS_ERROR_REG_NO_PATH";
nsResultErrors["80510007"] = "NS_ERROR_REG_NO_PATH";
nsResultErrors["80510008"] = "NS_ERROR_REG_READ_ONLY";
nsResultErrors["80510008"] = "NS_ERROR_REG_READ_ONLY";
nsResultErrors["80510009"] = "NS_ERROR_REG_BAD_UTF8";
nsResultErrors["80510009"] = "NS_ERROR_REG_BAD_UTF8";
nsResultErrors["80520001"] = "NS_ERROR_FILE_UNRECOGNIZED_PATH";
nsResultErrors["80520002"] = "NS_ERROR_FILE_UNRESOLVABLE_SYMLINK";
nsResultErrors["80520003"] = "NS_ERROR_FILE_EXECUTION_FAILED";
nsResultErrors["80520004"] = "NS_ERROR_FILE_UNKNOWN_TYPE";
nsResultErrors["80520005"] = "NS_ERROR_FILE_DESTINATION_NOT_DIR";
nsResultErrors["80520006"] = "NS_ERROR_FILE_TARGET_DOES_NOT_EXIST";
nsResultErrors["80520007"] = "NS_ERROR_FILE_COPY_OR_MOVE_FAILED";
nsResultErrors["80520008"] = "NS_ERROR_FILE_ALREADY_EXISTS";
nsResultErrors["80520009"] = "NS_ERROR_FILE_INVALID_PATH";
nsResultErrors["8052000a"] = "NS_ERROR_FILE_DISK_FULL";
nsResultErrors["8052000b"] = "NS_ERROR_FILE_CORRUPTED";
nsResultErrors["8052000c"] = "NS_ERROR_FILE_NOT_DIRECTORY";
nsResultErrors["8052000d"] = "NS_ERROR_FILE_IS_DIRECTORY";
nsResultErrors["8052000e"] = "NS_ERROR_FILE_IS_LOCKED";
nsResultErrors["8052000f"] = "NS_ERROR_FILE_TOO_BIG";
nsResultErrors["80520010"] = "NS_ERROR_FILE_NO_DEVICE_SPACE";
nsResultErrors["80520011"] = "NS_ERROR_FILE_NAME_TOO_LONG";
nsResultErrors["80520012"] = "NS_ERROR_FILE_NOT_FOUND";
nsResultErrors["80520013"] = "NS_ERROR_FILE_READ_ONLY";
nsResultErrors["80520014"] = "NS_ERROR_FILE_DIR_NOT_EMPTY";
nsResultErrors["80520015"] = "NS_ERROR_FILE_ACCESS_DENIED";
nsResultErrors["80530001"] = "NS_ERROR_DOM_INDEX_SIZE_ERR";
nsResultErrors["80530002"] = "NS_ERROR_DOM_DOMSTRING_SIZE_ERR";
nsResultErrors["80530003"] = "NS_ERROR_DOM_HIERARCHY_REQUEST_ERR";
nsResultErrors["80530004"] = "NS_ERROR_DOM_WRONG_DOCUMENT_ERR";
nsResultErrors["80530005"] = "NS_ERROR_DOM_INVALID_CHARACTER_ERR";
nsResultErrors["80530006"] = "NS_ERROR_DOM_NO_DATA_ALLOWED_ERR";
nsResultErrors["80530007"] = "NS_ERROR_DOM_NO_MODIFICATION_ALLOWED_ERR";
nsResultErrors["80530008"] = "NS_ERROR_DOM_NOT_FOUND_ERR";
nsResultErrors["80530009"] = "NS_ERROR_DOM_NOT_SUPPORTED_ERR";
nsResultErrors["8053000a"] = "NS_ERROR_DOM_INUSE_ATTRIBUTE_ERR";
nsResultErrors["8053000b"] = "NS_ERROR_DOM_INVALID_STATE_ERR";
nsResultErrors["8053000c"] = "NS_ERROR_DOM_SYNTAX_ERR";
nsResultErrors["8053000d"] = "NS_ERROR_DOM_INVALID_MODIFICATION_ERR";
nsResultErrors["8053000e"] = "NS_ERROR_DOM_NAMESPACE_ERR";
nsResultErrors["8053000f"] = "NS_ERROR_DOM_INVALID_ACCESS_ERR";
nsResultErrors["80530010"] = "NS_ERROR_DOM_VALIDATION_ERR";
nsResultErrors["80530011"] = "NS_ERROR_DOM_TYPE_MISMATCH_ERR";
nsResultErrors["805303e8"] = "NS_ERROR_DOM_SECURITY_ERR";
nsResultErrors["805303e9"] = "NS_ERROR_DOM_SECMAN_ERR";
nsResultErrors["805303ea"] = "NS_ERROR_DOM_WRONG_TYPE_ERR";
nsResultErrors["805303eb"] = "NS_ERROR_DOM_NOT_OBJECT_ERR";
nsResultErrors["805303ec"] = "NS_ERROR_DOM_NOT_XPC_OBJECT_ERR";
nsResultErrors["805303ed"] = "NS_ERROR_DOM_NOT_NUMBER_ERR";
nsResultErrors["805303ee"] = "NS_ERROR_DOM_NOT_BOOLEAN_ERR";
nsResultErrors["805303ef"] = "NS_ERROR_DOM_NOT_FUNCTION_ERR";
nsResultErrors["805303f0"] = "NS_ERROR_DOM_TOO_FEW_PARAMETERS_ERR";
nsResultErrors["805303f1"] = "NS_ERROR_DOM_BAD_DOCUMENT_DOMAIN";
nsResultErrors["805303f2"] = "NS_ERROR_DOM_PROP_ACCESS_DENIED";
nsResultErrors["805303f3"] = "NS_ERROR_DOM_XPCONNECT_ACCESS_DENIED";
nsResultErrors["805303f4"] = "NS_ERROR_DOM_BAD_URI";
nsResultErrors["805303f5"] = "NS_ERROR_DOM_RETVAL_UNDEFINED";
nsResultErrors["805303f6"] = "NS_ERROR_DOM_QUOTA_REACHED";
nsResultErrors["80540005"] = "NS_IMAGELIB_ERROR_FAILURE";
nsResultErrors["80540006"] = "NS_IMAGELIB_ERROR_NO_DECODER";
nsResultErrors["80540007"] = "NS_IMAGELIB_ERROR_NOT_FINISHED";
nsResultErrors["80540008"] = "NS_IMAGELIB_ERROR_LOAD_ABORTED";
nsResultErrors["80540009"] = "NS_IMAGELIB_ERROR_NO_ENCODER";
nsResultErrors["80560001"] = "NS_ERROR_EDITOR_NO_SELECTION";
nsResultErrors["80560002"] = "NS_ERROR_EDITOR_NO_TEXTNODE";
nsResultErrors["80560003"] = "NS_FOUND_TARGET";
nsResultErrors["805800c8"] = "NS_ERROR_LAUNCHED_CHILD_PROCESS";
nsResultErrors["80590001"] = "NS_ERROR_LDAP_OPERATIONS_ERROR";
nsResultErrors["80590002"] = "NS_ERROR_LDAP_PROTOCOL_ERROR";
nsResultErrors["80590003"] = "NS_ERROR_LDAP_TIMELIMIT_EXCEEDED";
nsResultErrors["80590004"] = "NS_ERROR_LDAP_SIZELIMIT_EXCEEDED";
nsResultErrors["80590005"] = "NS_ERROR_LDAP_COMPARE_FALSE";
nsResultErrors["80590006"] = "NS_ERROR_LDAP_COMPARE_TRUE";
nsResultErrors["80590007"] = "NS_ERROR_LDAP_STRONG_AUTH_NOT_SUPPORTED";
nsResultErrors["80590008"] = "NS_ERROR_LDAP_STRONG_AUTH_REQUIRED";
nsResultErrors["80590009"] = "NS_ERROR_LDAP_PARTIAL_RESULTS";
nsResultErrors["8059000a"] = "NS_ERROR_LDAP_REFERRAL";
nsResultErrors["8059000b"] = "NS_ERROR_LDAP_ADMINLIMIT_EXCEEDED";
nsResultErrors["8059000c"] = "NS_ERROR_LDAP_UNAVAILABLE_CRITICAL_EXTENSION";
nsResultErrors["8059000d"] = "NS_ERROR_LDAP_CONFIDENTIALITY_REQUIRED";
nsResultErrors["8059000e"] = "NS_ERROR_LDAP_SASL_BIND_IN_PROGRESS";
nsResultErrors["80590010"] = "NS_ERROR_LDAP_NO_SUCH_ATTRIBUTE";
nsResultErrors["80590011"] = "NS_ERROR_LDAP_UNDEFINED_TYPE";
nsResultErrors["80590012"] = "NS_ERROR_LDAP_INAPPROPRIATE_MATCHING";
nsResultErrors["80590013"] = "NS_ERROR_LDAP_CONSTRAINT_VIOLATION";
nsResultErrors["80590014"] = "NS_ERROR_LDAP_TYPE_OR_VALUE_EXISTS";
nsResultErrors["80590015"] = "NS_ERROR_LDAP_INVALID_SYNTAX";
nsResultErrors["80590020"] = "NS_ERROR_LDAP_NO_SUCH_OBJECT";
nsResultErrors["80590021"] = "NS_ERROR_LDAP_ALIAS_PROBLEM";
nsResultErrors["80590022"] = "NS_ERROR_LDAP_INVALID_DN_SYNTAX";
nsResultErrors["80590023"] = "NS_ERROR_LDAP_IS_LEAF";
nsResultErrors["80590024"] = "NS_ERROR_LDAP_ALIAS_DEREF_PROBLEM";
nsResultErrors["80590030"] = "NS_ERROR_LDAP_INAPPROPRIATE_AUTH";
nsResultErrors["80590031"] = "NS_ERROR_LDAP_INVALID_CREDENTIALS";
nsResultErrors["80590032"] = "NS_ERROR_LDAP_INSUFFICIENT_ACCESS";
nsResultErrors["80590033"] = "NS_ERROR_LDAP_BUSY";
nsResultErrors["80590034"] = "NS_ERROR_LDAP_UNAVAILABLE";
nsResultErrors["80590035"] = "NS_ERROR_LDAP_UNWILLING_TO_PERFORM";
nsResultErrors["80590036"] = "NS_ERROR_LDAP_LOOP_DETECT";
nsResultErrors["8059003c"] = "NS_ERROR_LDAP_SORT_CONTROL_MISSING";
nsResultErrors["8059003d"] = "NS_ERROR_LDAP_INDEX_RANGE_ERROR";
nsResultErrors["80590040"] = "NS_ERROR_LDAP_NAMING_VIOLATION";
nsResultErrors["80590041"] = "NS_ERROR_LDAP_OBJECT_CLASS_VIOLATION";
nsResultErrors["80590042"] = "NS_ERROR_LDAP_NOT_ALLOWED_ON_NONLEAF";
nsResultErrors["80590043"] = "NS_ERROR_LDAP_NOT_ALLOWED_ON_RDN";
nsResultErrors["80590044"] = "NS_ERROR_LDAP_ALREADY_EXISTS";
nsResultErrors["80590045"] = "NS_ERROR_LDAP_NO_OBJECT_CLASS_MODS";
nsResultErrors["80590046"] = "NS_ERROR_LDAP_RESULTS_TOO_LARGE";
nsResultErrors["80590047"] = "NS_ERROR_LDAP_AFFECTS_MULTIPLE_DSAS";
nsResultErrors["80590050"] = "NS_ERROR_LDAP_OTHER";
nsResultErrors["80590051"] = "NS_ERROR_LDAP_SERVER_DOWN";
nsResultErrors["80590052"] = "NS_ERROR_LDAP_LOCAL_ERROR";
nsResultErrors["80590053"] = "NS_ERROR_LDAP_ENCODING_ERROR";
nsResultErrors["80590054"] = "NS_ERROR_LDAP_DECODING_ERROR";
nsResultErrors["80590055"] = "NS_ERROR_LDAP_TIMEOUT";
nsResultErrors["80590056"] = "NS_ERROR_LDAP_AUTH_UNKNOWN";
nsResultErrors["80590057"] = "NS_ERROR_LDAP_FILTER_ERROR";
nsResultErrors["80590058"] = "NS_ERROR_LDAP_USER_CANCELLED";
nsResultErrors["80590059"] = "NS_ERROR_LDAP_PARAM_ERROR";
nsResultErrors["8059005a"] = "NS_ERROR_LDAP_NO_MEMORY";
nsResultErrors["8059005b"] = "NS_ERROR_LDAP_CONNECT_ERROR";
nsResultErrors["8059005c"] = "NS_ERROR_LDAP_NOT_SUPPORTED";
nsResultErrors["8059005d"] = "NS_ERROR_LDAP_CONTROL_NOT_FOUND";
nsResultErrors["8059005e"] = "NS_ERROR_LDAP_NO_RESULTS_RETURNED";
nsResultErrors["8059005f"] = "NS_ERROR_LDAP_MORE_RESULTS_TO_RETURN";
nsResultErrors["80590060"] = "NS_ERROR_LDAP_CLIENT_LOOP";
nsResultErrors["80590061"] = "NS_ERROR_LDAP_REFERRAL_LIMIT_EXCEEDED";
nsResultErrors["805a0400"] = "NS_ERROR_CMS_VERIFY_NOT_SIGNED";
nsResultErrors["805a0401"] = "NS_ERROR_CMS_VERIFY_NO_CONTENT_INFO";
nsResultErrors["805a0402"] = "NS_ERROR_CMS_VERIFY_BAD_DIGEST";
nsResultErrors["805a0404"] = "NS_ERROR_CMS_VERIFY_NOCERT";
nsResultErrors["805a0405"] = "NS_ERROR_CMS_VERIFY_UNTRUSTED";
nsResultErrors["805a0407"] = "NS_ERROR_CMS_VERIFY_ERROR_UNVERIFIED";
nsResultErrors["805a0408"] = "NS_ERROR_CMS_VERIFY_ERROR_PROCESSING";
nsResultErrors["805a0409"] = "NS_ERROR_CMS_VERIFY_BAD_SIGNATURE";
nsResultErrors["805a040a"] = "NS_ERROR_CMS_VERIFY_DIGEST_MISMATCH";
nsResultErrors["805a040b"] = "NS_ERROR_CMS_VERIFY_UNKNOWN_ALGO";
nsResultErrors["805a040c"] = "NS_ERROR_CMS_VERIFY_UNSUPPORTED_ALGO";
nsResultErrors["805a040d"] = "NS_ERROR_CMS_VERIFY_MALFORMED_SIGNATURE";
nsResultErrors["805a040e"] = "NS_ERROR_CMS_VERIFY_HEADER_MISMATCH";
nsResultErrors["805a040f"] = "NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED";
nsResultErrors["805a0410"] = "NS_ERROR_CMS_VERIFY_CERT_WITHOUT_ADDRESS";
nsResultErrors["805a0420"] = "NS_ERROR_CMS_ENCRYPT_NO_BULK_ALG";
nsResultErrors["805a0421"] = "NS_ERROR_CMS_ENCRYPT_INCOMPLETE";
nsResultErrors["805b0033"] = "NS_ERROR_DOM_INVALID_EXPRESSION_ERR";
nsResultErrors["805b0034"] = "NS_ERROR_DOM_TYPE_ERR";
nsResultErrors["805c0001"] = "NS_ERROR_DOM_RANGE_BAD_BOUNDARYPOINTS_ERR";
nsResultErrors["805c0002"] = "NS_ERROR_DOM_RANGE_INVALID_NODE_TYPE_ERR";
nsResultErrors["805d0001"] = "NS_ERROR_WONT_HANDLE_CONTENT";
nsResultErrors["805d001e"] = "NS_ERROR_MALWARE_URI";
nsResultErrors["805d001f"] = "NS_ERROR_PHISHING_URI";
nsResultErrors["805e0008"] = "NS_ERROR_IMAGE_SRC_CHANGED";
nsResultErrors["805e0009"] = "NS_ERROR_IMAGE_BLOCKED";
nsResultErrors["805e000a"] = "NS_ERROR_CONTENT_BLOCKED";
nsResultErrors["805e000b"] = "NS_ERROR_CONTENT_BLOCKED_SHOW_ALT";
nsResultErrors["805e000e"] = "NS_PROPTABLE_PROP_NOT_THERE";
nsResultErrors["80600001"] = "TM_ERROR";
nsResultErrors["80600001"] = "NS_ERROR_XSLT_PARSE_FAILURE";
nsResultErrors["80600002"] = "TM_ERROR_WRONG_QUEUE";
nsResultErrors["80600002"] = "NS_ERROR_XPATH_PARSE_FAILURE";
nsResultErrors["80600003"] = "TM_ERROR_NOT_POSTED";
nsResultErrors["80600003"] = "NS_ERROR_XSLT_ALREADY_SET";
nsResultErrors["80600004"] = "TM_ERROR_QUEUE_EXISTS";
nsResultErrors["80600004"] = "NS_ERROR_XSLT_EXECUTION_FAILURE";
nsResultErrors["80600005"] = "NS_ERROR_XPATH_UNKNOWN_FUNCTION";
nsResultErrors["80600006"] = "TM_SUCCESS_DELETE_QUEUE";
nsResultErrors["80600006"] = "NS_ERROR_XSLT_BAD_RECURSION";
nsResultErrors["80600007"] = "NS_ERROR_XSLT_BAD_VALUE";
nsResultErrors["80600008"] = "NS_ERROR_XSLT_NODESET_EXPECTED";
nsResultErrors["80600009"] = "NS_ERROR_XSLT_ABORTED";
nsResultErrors["8060000a"] = "NS_ERROR_XSLT_NETWORK_ERROR";
nsResultErrors["8060000b"] = "NS_ERROR_XSLT_WRONG_MIME_TYPE";
nsResultErrors["8060000c"] = "NS_ERROR_XSLT_LOAD_RECURSION";
nsResultErrors["8060000d"] = "NS_ERROR_XPATH_BAD_ARGUMENT_COUNT";
nsResultErrors["8060000e"] = "NS_ERROR_XPATH_BAD_EXTENSION_FUNCTION";
nsResultErrors["8060000f"] = "NS_ERROR_XPATH_PAREN_EXPECTED";
nsResultErrors["80600010"] = "NS_ERROR_XPATH_INVALID_AXIS";
nsResultErrors["80600011"] = "NS_ERROR_XPATH_NO_NODE_TYPE_TEST";
nsResultErrors["80600012"] = "NS_ERROR_XPATH_BRACKET_EXPECTED";
nsResultErrors["80600013"] = "NS_ERROR_XPATH_INVALID_VAR_NAME";
nsResultErrors["80600014"] = "NS_ERROR_XPATH_UNEXPECTED_END";
nsResultErrors["80600015"] = "NS_ERROR_XPATH_OPERATOR_EXPECTED";
nsResultErrors["80600016"] = "NS_ERROR_XPATH_UNCLOSED_LITERAL";
nsResultErrors["80600017"] = "NS_ERROR_XPATH_BAD_COLON";
nsResultErrors["80600018"] = "NS_ERROR_XPATH_BAD_BANG";
nsResultErrors["80600019"] = "NS_ERROR_XPATH_ILLEGAL_CHAR";
nsResultErrors["8060001a"] = "NS_ERROR_XPATH_BINARY_EXPECTED";
nsResultErrors["8060001b"] = "NS_ERROR_XSLT_LOAD_BLOCKED_ERROR";
nsResultErrors["8060001c"] = "NS_ERROR_XPATH_INVALID_EXPRESSION_EVALUATED";
nsResultErrors["8060001d"] = "NS_ERROR_XPATH_UNBALANCED_CURLY_BRACE";
nsResultErrors["8060001e"] = "NS_ERROR_XSLT_BAD_NODE_NAME";
nsResultErrors["8060001f"] = "NS_ERROR_XSLT_VAR_ALREADY_SET";
nsResultErrors["80620000"] = "NS_ERROR_DOM_SVG_WRONG_TYPE_ERR";
nsResultErrors["80620001"] = "NS_ERROR_DOM_SVG_INVALID_VALUE_ERR";
nsResultErrors["80620002"] = "NS_ERROR_DOM_SVG_MATRIX_NOT_INVERTABLE";
nsResultErrors["80630001"] = "MOZ_ERROR_STORAGE_ERROR";
nsResultErrors["80640001"] = "NS_ERROR_SCHEMAVALIDATOR_NO_SCHEMA_LOADED";
nsResultErrors["80640002"] = "NS_ERROR_SCHEMAVALIDATOR_NO_DOM_NODE_SPECIFIED";
nsResultErrors["80640003"] = "NS_ERROR_SCHEMAVALIDATOR_NO_TYPE_FOUND";
nsResultErrors["80640004"] = "NS_ERROR_SCHEMAVALIDATOR_TYPE_NOT_FOUND";
nsResultErrors["80650000"] = "NS_ERROR_DOM_FILE_NOT_FOUND_ERR";
nsResultErrors["80650001"] = "NS_ERROR_DOM_FILE_NOT_READABLE_ERR";
nsResultErrors["80780001"] = "NS_ERROR_WSDL_NOT_WSDL_ELEMENT";
nsResultErrors["80780001"] = "NS_ERROR_SCHEMA_NOT_SCHEMA_ELEMENT";
nsResultErrors["80780001"] = "NS_ERROR_SCHEMA_NOT_SCHEMA_ELEMENT";
nsResultErrors["80780001"] = "NS_ERROR_DOWNLOAD_COMPLETE";
nsResultErrors["80780002"] = "NS_ERROR_WSDL_SCHEMA_PROCESSING_ERROR";
nsResultErrors["80780002"] = "NS_ERROR_SCHEMA_UNKNOWN_TARGET_NAMESPACE";
nsResultErrors["80780002"] = "NS_ERROR_SCHEMA_UNKNOWN_TARGET_NAMESPACE";
nsResultErrors["80780002"] = "NS_ERROR_DOWNLOAD_NOT_PARTIAL";
nsResultErrors["80780003"] = "NS_ERROR_WSDL_BINDING_NOT_FOUND";
nsResultErrors["80780003"] = "NS_ERROR_SCHEMA_UNKNOWN_TYPE";
nsResultErrors["80780003"] = "NS_ERROR_SCHEMA_UNKNOWN_TYPE";
nsResultErrors["80780004"] = "NS_ERROR_WSDL_UNKNOWN_SCHEMA_COMPONENT";
nsResultErrors["80780004"] = "NS_ERROR_SCHEMA_UNKNOWN_PREFIX";
nsResultErrors["80780004"] = "NS_ERROR_SCHEMA_UNKNOWN_PREFIX";
nsResultErrors["80780005"] = "NS_ERROR_WSDL_UNKNOWN_WSDL_COMPONENT";
nsResultErrors["80780005"] = "NS_ERROR_SCHEMA_INVALID_STRUCTURE";
nsResultErrors["80780005"] = "NS_ERROR_SCHEMA_INVALID_STRUCTURE";
nsResultErrors["80780006"] = "NS_ERROR_WSDL_LOADING_ERROR";
nsResultErrors["80780006"] = "NS_ERROR_SCHEMA_INVALID_TYPE_USAGE";
nsResultErrors["80780006"] = "NS_ERROR_SCHEMA_INVALID_TYPE_USAGE";
nsResultErrors["80780007"] = "NS_ERROR_WSDL_RECURSIVE_IMPORT";
nsResultErrors["80780007"] = "NS_ERROR_SCHEMA_MISSING_TYPE";
nsResultErrors["80780007"] = "NS_ERROR_SCHEMA_MISSING_TYPE";
nsResultErrors["80780008"] = "NS_ERROR_WSDL_NOT_ENABLED";
nsResultErrors["80780008"] = "NS_ERROR_SCHEMA_FACET_VALUE_ERROR";
nsResultErrors["80780008"] = "NS_ERROR_SCHEMA_FACET_VALUE_ERROR";
nsResultErrors["80780009"] = "NS_ERROR_SCHEMA_LOADING_ERROR";
nsResultErrors["80780009"] = "NS_ERROR_SCHEMA_LOADING_ERROR";
nsResultErrors["8078000a"] = "IPC_WAIT_NEXT_MESSAGE";
nsResultErrors["80780021"] = "NS_ERROR_UNORM_MOREOUTPUT";
nsResultErrors["807803e9"] = "NS_ERROR_WEBSHELL_REQUEST_REJECTED";
nsResultErrors["807807d1"] = "NS_ERROR_DOCUMENT_IS_PRINTMODE";
nsResultErrors["80780bb9"] = "NS_ERROR_XFORMS_CALCUATION_EXCEPTION";
nsResultErrors["80780bb9"] = "NS_ERROR_XFORMS_CALCULATION_EXCEPTION";
nsResultErrors["80780bba"] = "NS_ERROR_XFORMS_UNION_TYPE";