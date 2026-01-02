<?php

namespace Database\Seeders;

use App\Models\Assembly;
use App\Models\Session;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AssemblySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create 10th Parliament Assembly
        $assembly = Assembly::create([
            'name' => '10th Parliament',
            'description' => 'The 10th Parliament of the Senate of the Federal Republic of Nigeria',
            'start_date' => Carbon::parse('2023-07-01'),
            'end_date' => Carbon::parse('2027-06-30'),
            'is_active' => true,
        ]);

        // Create sessions for the 10th Parliament
        Session::create([
            'assembly_id' => $assembly->id,
            'name' => '1st Session',
            'description' => 'First Session of the 10th Parliament',
            'start_date' => Carbon::parse('2023-07-01'),
            'end_date' => Carbon::parse('2024-06-30'),
            'order' => 1,
        ]);

        Session::create([
            'assembly_id' => $assembly->id,
            'name' => '2nd Session',
            'description' => 'Second Session of the 10th Parliament',
            'start_date' => Carbon::parse('2024-07-01'),
            'end_date' => Carbon::parse('2025-06-30'),
            'order' => 2,
        ]);

        Session::create([
            'assembly_id' => $assembly->id,
            'name' => '3rd Session',
            'description' => 'Third Session of the 10th Parliament',
            'start_date' => Carbon::parse('2025-07-01'),
            'end_date' => Carbon::parse('2026-06-30'),
            'order' => 3,
        ]);
    }
}

