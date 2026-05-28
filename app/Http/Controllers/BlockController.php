<?php

namespace App\Http\Controllers;

use App\Models\Block;
use App\Models\Floor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class BlockController extends Controller
{
    /**
     * List all blocks with eager loaded floor structures.
     */
    public function index(): JsonResponse
    {
        $blocks = Block::with('floors.units.resident')->get();

        return response()->json([
            'status' => 'success',
            'data' => $blocks
        ]);
    }

    /**
     * Create a new housing block.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:blocks,name',
            'notes' => 'nullable|string',
            'total_floors' => 'nullable|integer|min:1|max:100',
            'units_per_floor' => 'nullable|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $block = Block::create([
            'name' => $request->name,
            'notes' => $request->notes,
        ]);

        // Auto-bootstrap floors and empty units if requested during block setup
        if ($request->has('total_floors') && $request->has('units_per_floor')) {
            $totalFloors = (int) $request->total_floors;
            $unitsPerFloor = (int) $request->units_per_floor;

            for ($f = 1; $f <= $totalFloors; $f++) {
                $floorHash = 'QR-B' . $block->id . '-F' . $f . '-' . Str::random(8);
                $floor = Floor::create([
                    'block_id' => $block->id,
                    'floor_number' => $f,
                    'qr_code_hash' => $floorHash,
                ]);

                for ($u = 1; $u <= $unitsPerFloor; $u++) {
                    $unitNumStr = sprintf('%s-%d%02d', Str::slug($block->name, ''), $f, $u);
                    $unitHash = 'QR-B' . $block->id . '-F' . $f . '-U' . $u . '-' . Str::random(8);

                    $floor->units()->create([
                        'unit_number' => strtoupper($unitNumStr),
                        'qr_code_hash' => $unitHash,
                    ]);
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Block structure successfully established.',
            'data' => $block->load('floors.units')
        ], 210);
    }

    /**
     * Show block details.
     */
    public function show(Block $block): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $block->load('floors.units.resident')
        ]);
    }

    /**
     * Update block options.
     */
    public function update(Request $request, Block $block): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:blocks,name,' . $block->id,
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $block->update([
            'name' => $request->name,
            'notes' => $request->notes,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Block structure modified successfully.',
            'data' => $block
        ]);
    }

    /**
     * Delete block and its structural elements.
     */
    public function destroy(Block $block): JsonResponse
    {
        $block->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Block and all its nested levels deleted successfully.'
        ]);
    }

    /**
     * Add single floor dynamically.
     */
    public function addFloor(Request $request, Block $block): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'floor_number' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check unique block/floor
        $exists = Floor::where('block_id', $block->id)
            ->where('floor_number', $request->floor_number)
            ->exists();

        if ($exists) {
            return response()->json([
                'status' => 'error',
                'message' => 'This floor number already exists inside ' . $block->name
            ], 400);
        }

        $hash = 'QR-B' . $block->id . '-F' . $request->floor_number . '-' . Str::random(8);

        $floor = Floor::create([
            'block_id' => $block->id,
            'floor_number' => $request->floor_number,
            'qr_code_hash' => $hash,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Floor level appended successfully.',
            'data' => $floor
        ], 210);
    }
}
