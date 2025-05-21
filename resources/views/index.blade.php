@extends('layouts.app')

@section('content')
    <div
        class="flex flex-col justify-center items-start w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-screen px-4 sm:px-6 md:px-8 bg-center bg-no-repeat bg-cover"
        style="background-image: url('/image/background.png'); background-size: cover; ">
        <h2 class="text-2xl sm:text-3xl md:text-5xl font-bold text-neutral-50 leading-snug md:leading-[4rem] max-w-full sm:max-w-xl">
            Track Your Stress,<br />Understand Your Mind.
        </h2>
        <p class="text-sm sm:text-base md:text-lg mt-4 text-neutral-50 max-w-full sm:max-w-lg">
            Welcome to Hidden Mood — a private space to help you <br />
            monitor stress levels, visualize emotional trends, and receive <br />
            calming content based on how you feel!
        </p>
        <a
            href="/signup"
            class="mt-5 inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 max-w-max"
        >
            Sign Up
        </a>
    </div>

    <div class="text-center flex flex-col px-4 py-10 sm:px-6 md:px-10 max-w-full sm:max-w-7xl mx-auto">
        <h3 class="mt-10 text-lg sm:text-xl md:text-2xl font-semibold max-w-full sm:max-w-3xl mx-auto leading-relaxed">
            Over <span class="text-violet-700">70%</span> of 
            <span class="text-violet-700">young adults</span> experience high stress 
            <span class="hidden md:inline"><br /></span> without even recognizing it. Unchecked stress 
            <span class="hidden md:inline"><br /></span> can lead to 
            <span class="text-violet-700">burnout</span>, 
            <span class="text-violet-700">anxiety</span>, and 
            <span class="text-violet-700">depression</span>. 
            <span class="hidden md:inline"><br /></span> That’s why tracking your emotional state is the first 
            <span class="hidden md:inline"><br /></span> step toward better mental health.
        </h3>


        <h3 class="mt-10 text-lg sm:text-xl md:text-2xl font-semibold">What’s Special About Us?</h3>

        <div class="mt-5 flex flex-col space-y-5 sm:flex-row sm:space-y-0 sm:space-x-10 justify-center max-w-full sm:max-w-4xl mx-auto">
            <div class="bg-white shadow p-5 rounded-lg">
                <p>Track your stress levels through mood dashboard</p>
            </div>
            <div class="bg-white shadow p-5 rounded-lg">
                <p>Discover what influenced your results</p>
            </div>
            <div class="bg-white shadow p-5 rounded-lg">
                <p>Get recommendations based on your current stress level.</p>
            </div>
        </div>
    </div>

    <section class="mt-10 px-4 py-6 sm:px-6 md:px-10 max-w-full sm:max-w-4xl mx-auto">
        <h2 class="text-base sm:text-lg md:text-xl font-bold mb-2">Our Vision & Mission</h2>
        <p class="text-sm sm:text-base md:text-lg leading-relaxed">
            HiMO aims to make emotional self-awareness a natural part of daily life — by empowering individuals to understand and manage their mental well-being through empathetic, intelligent technology.
        </p>
    </section>
@endsection
