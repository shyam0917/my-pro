<?php
$allowedHosts = array('knowledgecity.com', 'kcexp.pro', 'kcdev.pro', 'kcstage.pro');
$hostInfo = explode(".",$_SERVER['HTTP_HOST']);
$portalCode = $hostInfo[0];
$host = @(in_array($hostInfo[1].".".$hostInfo[2], $allowedHosts) ? $hostInfo[1].".".$hostInfo[2] : $allowedHosts[0]);
$cdnFilePath = "https://cdn0origin.".$host."/opencontent/portals/assets/loaderIcon/".$portalCode.".png";

$imgContent = @file_get_contents($cdnFilePath);

if(strstr($http_response_header[0], "404")){
	// if file does not exist
	$fileName = "loader-logo.png";
	$imgContent = file_get_contents($fileName);
	$fileDate = date('D, d M Y H:i:s T', filemtime($fileName));
}else{
	// if file does exist
	$fileDate = getResponseHeader("Last-Modified", $http_response_header);
}

header("Content-Type:image/png");
header("ETag: \"".md5($imgContent)."\"");
header("Accept-Ranges: bytes");
header("Last-Modified: ".$fileDate);
echo $imgContent;


function getResponseHeader($header, $response) {
  foreach ($response as $key => $r) {
     // Match the header name up to ':', compare lower case
     if (stripos($r, $header . ':') === 0) {
        list($headername, $headervalue) = explode(":", $r, 2);
        return trim($headervalue);
     }
  }
}