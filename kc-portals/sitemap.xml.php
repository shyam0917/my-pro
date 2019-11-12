<?
header("Content-type: text/xml;");

$allowedHosts = array('knowledgecity.com', 'kcexp.pro', 'kcdev.pro', 'kcstage.pro');
$content = array();
$hostInfo = explode(".",$_SERVER['HTTP_HOST']);
$portalCode = $hostInfo[0];
$host = (in_array($hostInfo[1].".".$hostInfo[2], $allowedHosts) ? $hostInfo[1].".".$hostInfo[2] : $allowedHosts[0]);
$apiEndPoint = "http://api.".$host."/v2/portals/0".$portalCode;
$portalInfo = json_decode(file_get_contents($apiEndPoint), true);
$portalId = $portalInfo = $portalInfo['response']['id'];
$cdnFilePath = "http://cdn0origin.".$host."/opencontent/portals/".$portalId."/metafiles/sitemap.xml";

$sitemapFileContent = file_get_contents($cdnFilePath);
if(strstr($http_response_header[0], "404")){
	$content[] = '<?xml version="1.0" encoding="UTF-8"?>';
	$content[] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">';

	$content[] = '<url><loc>'.$_SERVER['REQUEST_SCHEME'].'://'.$_SERVER['HTTP_HOST'].'</loc><priority>1</priority></url>';

	$content[] = '</urlset>';
}else{
	$content[] = trim($sitemapFileContent);
}

echo implode("\n", $content);

