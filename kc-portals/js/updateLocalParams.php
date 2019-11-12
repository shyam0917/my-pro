<?php
if($argv[1]) {
	$environment = $argv[1];
	$dir = "js/";
	$dir1 = "";
}
if(isset($_GET['env'])) {
	$environment = $_GET['env'];
	$dir = "";
	$dir1 = "../";
}
echo "environment: ".$environment."\n";
if($environment == 'experimental'){
	$cdnUrl = "https://cdn0.kcexp.pro/";
	$staticContentUrl = "https://staticcontent.kcexp.pro";
}
if($environment == 'development'){
	$cdnUrl = "https://cdn0.kcdev.pro/";
	$staticContentUrl = "https://staticcontent.kcdev.pro";
	// $overrideConfig = array(
	// 	"APIUrl"=>"https://api.kcdev.pro/v2/",
 //    	"quizSite"=>"https://kcquiz.kcdev.pro/",
 //    	"CDNPortal"=>"https://cdn0.kcdev.pro/",
 //    	"CDNJson"=>"https://cdn0.kcdev.pro/",
 //    	"CDNVendors"=>"https://cdn0.kcdev.pro/vendors/",
 //    	"staticContentHost"=>"https://staticcontent.kcdev.pro",
 //    	"LocalStorageStamp"=>time()
 //    );

}
if($environment == 'stage'){
	$cdnUrl = "https://cdn0.kcstage.pro/";
	$staticContentUrl = "https://staticcontent.kcstage.pro";
}
if($environment == 'production'){
	$cdnUrl = "https://cdn0.knowledgecity.com/";
	$staticContentUrl = "https://staticcontent.knowledgecity.com";
}
if($environment == 'none'){
	$cdnUrl = "https://cdn0.knowledgecity.com/";
	$staticContentUrl = "";
}
echo "cdnUrl: ".$cdnUrl."\n";
echo "staticContentUrl: ".$staticContentUrl."\n";

// modify application version
$filePath = $dir."1.0/appV.js";
$mainFileContent = "var appV='".date("YmdHis", time())."';";
$success = file_put_contents($filePath, $mainFileContent);
echo $success ? "file appV.js updated\n" : "file appV.js NOT updated\n";

if(isset($cdnUrl) && isset($staticContentUrl)){
	// modify main.js
	$filePath = $dir."1.0/main.js";
	$mainFileContent = file($filePath);
	$mainFileContent[0] = "var CDN = '".$cdnUrl."vendors/';\n";
	$mainFileContent[1] = "var STATICHOST = '".$staticContentUrl."';\n";
	$mainFileContent = implode("", $mainFileContent);
	$success = file_put_contents($filePath, $mainFileContent);
	echo $success ? "file main.js updated\n" : "file main.js NOT updated\n";

	// modify gulpfile.js
	$filePath = $dir1."gulpfile.js";
	$mainFileContent = file($filePath);
	$mainFileContent[0] = "var STATICHOST = '".$staticContentUrl."';\n";
	$mainFileContent = implode("", $mainFileContent);
	$success = file_put_contents($filePath, $mainFileContent);
	echo $success ? "file gulpfile.js updated\n" : "file gulpfile.js NOT updated\n";

	// modify index.html source file
	$filePath = $dir1."src/index.htm";
	$mainFileContent = file_get_contents($filePath);
	$mainFileContent = str_replace("{{cdnUrl}}", $cdnUrl, $mainFileContent);
	$success = file_put_contents($filePath, $mainFileContent);
	echo $success ? "file index.html updated\n" : "file index.html NOT updated\n";


	// modify config.js source file
	if(isset($overrideConfig) && is_array($overrideConfig) && sizeof($overrideConfig)){
		$filePath = $dir."1.0/config.js";
		$mainFileContent = file($filePath);
		$oc = "var overrideConfig=".json_encode($overrideConfig)."\n";
		array_unshift($mainFileContent, $oc);
		$mainFileContent = implode("", $mainFileContent);
		$success = file_put_contents($filePath, $mainFileContent);
		echo $success ? "file config.js updated\n" : "file config.js NOT updated\n";
	}
	
}else echo "file update ignored\n";
