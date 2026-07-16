<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Job;

$jobs = Job::with(['block', 'floor', 'unit'])->get();
foreach ($jobs as $j) {
    $unitNum = $j->unit ? $j->unit->unit_number : 'None';
    $blockName = $j->block ? $j->block->name : 'None';
    $floorNum = $j->floor ? $j->floor->floor_number : 'None';
    echo "Job ID: {$j->id}, Block: {$blockName}, Floor: {$floorNum}, Unit: {$unitNum}, Status: {$j->status}, Date: {$j->scheduled_date}, Shift: {$j->shift}\n";
}
