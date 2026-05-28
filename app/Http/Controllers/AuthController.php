<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    /**
     * Authenticate user credentials and issue active Sanctum API tokens.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = User::where('email', $request->email)->first();
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Database connection error. Please ensure the database is migrated and seeded.'
            ], 500);
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Provided credentials do not match our records.'
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'status' => 'error',
                'message' => 'Your account is currently deactivated.'
            ], 403);
        }

        // Generate Sanctum access token
        $deviceName = $request->device_name ?? 'pwa-client-device';
        $token = $user->createToken($deviceName, ["role:{$user->role}"])->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Authenticated successfully.',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'shift' => $user->shift,
                    'profile_photo_url' => $user->profile_photo_path ? asset('storage/' . $user->profile_photo_path) : null,
                ]
            ]
        ], 200);
    }

    /**
     * Terminate the token session and log out the user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Session terminated and logged out successfully.'
        ]);
    }

    /**
     * Retrieve the currently authenticated user's profile with contextual layout relations.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Eager load related units or stats depending on the user's role
        if ($user->role === 'resident') {
            $user->load(['units.floor.block']);
        }

        return response()->json([
            'status' => 'success',
            'data' => $user
        ]);
    }

    /**
     * Update current user profile basic bio information.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'fcm_token' => 'nullable|string',
            'current_password' => 'nullable|string|required_with:password',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->password) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => [
                        'current_password' => ['Provided current password does not match our records.']
                    ]
                ], 422);
            }
        }

        $updateData = [
            'name' => $request->name,
            'phone' => $request->phone,
        ];

        if ($request->has('fcm_token')) {
            $updateData['fcm_token'] = $request->fcm_token;
        }

        if ($request->password) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return response()->json([
            'status' => 'success',
            'message' => 'Profile settings updated successfully.',
            'data' => $user
        ], 200);
    }

    /**
     * Upload or update profile portrait photo.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048', // Max 2MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->file('photo')) {
            $photoPath = $request->file('photo')->store('profile-photos', 'public');
            
            $user->update([
                'profile_photo_path' => $photoPath,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Profile photo updated successfully.',
                'data' => [
                    'profile_photo_url' => asset('storage/' . $photoPath)
                ]
            ], 200);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'No image file uploaded.'
        ], 400);
    }

    /**
     * Generate a temporary secure password and simulate SMS dispatch.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No account found matching this email address.'
            ], 404);
        }

        // Generate a random temporary 6-digit numeric password prefixed for high fidelity
        $tempPassword = 'TEMP-' . rand(100000, 999999);

        // Update the password in the database securely
        $user->update([
            'password' => Hash::make($tempPassword)
        ]);

        // Simulating SMS Dispatch
        $phoneNum = $user->phone ?? '+94 77 000 1122';
        $maskedPhone = substr($phoneNum, 0, 3) . '***' . substr($phoneNum, -4);

        return response()->json([
            'status' => 'success',
            'message' => 'A temporary password has been successfully generated and dispatched via SMS.',
            'data' => [
                'phone' => $phoneNum,
                'masked_phone' => $maskedPhone,
                'temp_password' => $tempPassword,
                'sms_text' => "EcoTrack Security Alert: Your temporary security credentials are: {$tempPassword}. Please use this token to login and reset your password immediately."
            ]
        ], 200);
    }
}
