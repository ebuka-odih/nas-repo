<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('legislative_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assembly_id')->constrained()->onDelete('cascade');
            $table->string('name'); // e.g., "First Session", "Second Session"
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
            
            $table->index(['assembly_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('legislative_sessions');
    }
};
