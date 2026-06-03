<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Http\Kernel::class)->bootstrap();

$mysql_time = DB::select("SELECT NOW() as now, @@global.time_zone as global_tz, @@session.time_zone as session_tz")[0];
echo "MySQL NOW(): " . $mysql_time->now . "\n";
echo "MySQL Global TZ: " . $mysql_time->global_tz . "\n";
echo "MySQL Session TZ: " . $mysql_time->session_tz . "\n";

echo "PHP NOW() (UTC): " . gmdate("Y-m-d H:i:s") . "\n";
echo "PHP NOW() (Local): " . date("Y-m-d H:i:s") . "\n";
