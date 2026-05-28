<?php

namespace App\Http\Controllers;

use App\Models\Floor;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class FloorController extends Controller
{
    /**
     * Dynamically append a residential unit to a specified floor.
     */
    public function addUnit(Request $request, Floor $floor): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'unit_number' => 'required|string|max:50',
            'resident_id' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if unit number is unique on this floor level to prevent duplicate keys
        $exists = Unit::where('floor_id', $floor->id)
            ->where('unit_number', $request->unit_number)
            ->exists();

        if ($exists) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unit number already exists on this floor level.'
            ], 400);
        }

        $qrHash = 'QR-B' . $floor->block_id . '-F' . $floor->floor_number . '-U' . Str::upper(Str::random(6));

        $unit = Unit::create([
            'floor_id' => $floor->id,
            'unit_number' => $request->unit_number,
            'resident_id' => $request->resident_id,
            'qr_code_hash' => $qrHash,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Residential unit appended and assigned successfully.',
            'data' => $unit->load('resident')
        ], 201);
    }
}
