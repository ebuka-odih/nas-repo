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
        Schema::create('agenda_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sitting_id')->constrained()->onDelete('cascade');
            $table->integer('agenda_number');
            $table->string('title');
            $table->text('procedural_text');
            $table->text('outcome')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
            
            $table->unique(['sitting_id', 'agenda_number']);
            $table->index(['sitting_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agenda_items');
    }
};
