<?php
header("Content-type: application/json");
//inside .well-known/.apple-app-site-association there a JSON file for each specific app.
$path="";
$pathDefault="default.json";
$content = array();
$hostInfo = explode(".",$_SERVER['HTTP_HOST']);
$portalCode = $hostInfo[0];

//it always returns a JSON just in case of being Universal APP
$thePath = $path.$portalCode.".json";
if(file_exists($thePath)){
  $theData = file_get_contents($thePath);
}else if(file_exists($pathDefault)){
  $theData = file_get_contents($pathDefault);
}else {
$theData="";
}

echo ($theData);
