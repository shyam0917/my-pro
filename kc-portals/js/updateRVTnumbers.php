<?php
$fileName = "overrideConfig.json";
if(!is_file($fileName)) exit;

$configArray = json_decode(file_get_contents($fileName), true);
$keys = array("LocalStorageStamp");
foreach ($keys as $key) {
	$value = floatval($configArray[$key]);
	$configArray[$key] = time();
}
$f = fopen($fileName, 'w');
fwrite($f, json_encode($configArray, JSON_PRETTY_PRINT));
fclose($f);