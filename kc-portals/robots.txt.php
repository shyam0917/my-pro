<?php
header("Content-type: text/plain;");

$allowedHosts = array('knowledgecity.com', 'kcexp.pro', 'kcdev.pro', 'kcstage.pro');
$content = array();
$hostInfo = explode(".",$_SERVER['HTTP_HOST']);
$portalCode = $hostInfo[0];

// domain like staticcontent.knowledgecity.com is pointing to CDN edge server and it pulls conten from origin stargate.knowledgecity.com. Without the condition below file https://staticcontent.knowledgecity.com/robots.txt had directive Disallow: / which caused www portal to be not indexable
if($portalCode == "stargate") $portalCode = "www";

$host = (in_array($hostInfo[1].".".$hostInfo[2], $allowedHosts) ? $hostInfo[1].".".$hostInfo[2] : $allowedHosts[0]);
$apiEndPoint = "http://api.".$host."/v2/portals/0".$portalCode;
$portalInfo = json_decode(file_get_contents($apiEndPoint), true);
$portalId = $portalInfo = $portalInfo['response']['id'];
$cdnFilePath = "http://cdn0origin.".$host."/opencontent/portals/".$portalId."/metafiles/robots.txt";

$robotsFileContent = file_get_contents($cdnFilePath);
if(strstr($http_response_header[0], "404")){
	$content[] = "User-agent: *";
	$content[] = "Disallow: /";
}else{
	$content[] = trim($robotsFileContent);
}

echo implode("\n", $content);