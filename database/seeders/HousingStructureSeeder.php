<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Block;
use App\Models\Floor;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Str;

class HousingStructureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Blocks
        $blockA = Block::create([
            'name' => 'Block A',
            'notes' => 'Primary Resident Wing - Greenfield Complex'
        ]);

        $blockB = Block::create([
            'name' => 'Block B',
            'notes' => 'Secondary High-Rise Tower Section'
        ]);

        $blockC = Block::create([
            'name' => 'Block C',
            'notes' => 'Duplex and Premium Penthouse Suites Wing'
        ]);

        // Fetch Resident Users to map on specific units
        $chaminda = User::where('email', 'chaminda@ecotrack.lk')->first();
        $dilani = User::where('email', 'dilani@gmail.com')->first();
        $priya = User::where('email', 'priya@gmail.com')->first();
        $ranil = User::where('email', 'ranilh@gmail.com')->first();
        $sasini = User::where('email', 'sasini@gmail.com')->first();

        // 2. Generate Floor Levels & Unit grids for Block A
        for ($f = 1; $f <= 4; $f++) {
            $floor = Floor::create([
                'block_id' => $blockA->id,
                'floor_number' => $f,
                'qr_code_hash' => "QR-BA-F{$f}-" . Str::upper(Str::random(6)),
            ]);

            // Add standard units
            for ($u = 1; $u <= 5; $u++) {
                $unitNum = sprintf('A-%d%02d', $f, $u); // e.g. A-101, A-102
                $residentId = null;

                // Match specific resident assignments to reflect UI context
                if ($unitNum === 'A-101' && $chaminda) {
                    $residentId = $chaminda->id;
                } elseif ($unitNum === 'A-105' && $priya) {
                    $residentId = $priya->id;
                } elseif ($unitNum === 'A-201' && $ranil) {
                    $residentId = $ranil->id;
                } elseif ($unitNum === 'A-301' && $sasini) {
                    $residentId = $sasini->id;
                }

                Unit::create([
                    'floor_id' => $floor->id,
                    'unit_number' => $unitNum,
                    'resident_id' => $residentId,
                    'qr_code_hash' => "QR-BA-F{$f}-U{$u}-" . Str::upper(Str::random(6)),
                ]);
            }
        }

        // 3. Generate Floor Levels & Unit grids for Block B
        for ($f = 1; $f <= 3; $f++) {
            $floor = Floor::create([
                'block_id' => $blockB->id,
                'floor_number' => $f,
                'qr_code_hash' => "QR-BB-F{$f}-" . Str::upper(Str::random(6)),
            ]);

            for ($u = 1; $u <= 4; $u++) {
                $unitNum = sprintf('B-%d%02d', $f, $u);
                $residentId = null;

                if ($unitNum === 'B-204' && $dilani) {
                    $residentId = $dilani->id;
                }

                Unit::create([
                    'floor_id' => $floor->id,
                    'unit_number' => $unitNum,
                    'resident_id' => $residentId,
                    'qr_code_hash' => "QR-BB-F{$f}-U{$u}-" . Str::upper(Str::random(6)),
                ]);
            }
        }

        // 4. Generate Floor Levels & Unit grids for Block C
        for ($f = 1; $f <= 3; $f++) {
            $floor = Floor::create([
                'block_id' => $blockC->id,
                'floor_number' => $f,
                'qr_code_hash' => "QR-BC-F{$f}-" . Str::upper(Str::random(6)),
            ]);

            for ($u = 1; $u <= 4; $u++) {
                $unitNum = sprintf('C-%d%02d', $f, $u);

                Unit::create([
                    'floor_id' => $floor->id,
                    'unit_number' => $unitNum,
                    'resident_id' => null,
                    'qr_code_hash' => "QR-BC-F{$f}-U{$u}-" . Str::upper(Str::random(6)),
                ]);
            }
        }
    }
}
