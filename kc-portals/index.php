<?php
die(str_replace("<head>", "<head><meta name=\"robots\" content=\"noindex\" />", file_get_contents("index.htm")));