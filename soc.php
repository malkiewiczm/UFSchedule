#!/usr/local/bin/php

	<?php

function die_error($what) {
	die('{"error":{"title":"Local Error","description":"' . $what . '","message":""}}');
}

header('Content-type: application/json');

if (empty($_GET['t']))
	die_error('Term not specified');
if (empty($_GET['c']))
	die_error('Course not specified');

$term = $_GET['t'];
$course = $_GET['c'];

$url = null;

if ($term == 'fal') {
	$url = 'https://one.uf.edu/apix/soc/schedule/?category=CWSP&term=2198&course-code=';
} else if ($term == 'spr') {
	$url = 'https://one.uf.edu/apix/soc/schedule/?category=CWSP&term=2191&course-code=';
} else if ($term == 'sum') {
  	$url = 'https://one.uf.edu/apix/soc/schedule/?category=CWSP&term=2195&course-code=';
} else {
	die_error('Term not found');
}

$data = file_get_contents($url . $course);
if ($data) {
   echo($data);
} else {
	die_error('No data returned');
}

	?>
