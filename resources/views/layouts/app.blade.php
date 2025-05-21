<!DOCTYPE html>
<html lang="en">
<head>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="{{ asset('css/app.css') }}" rel="stylesheet">
     <link href="/css/app.css" rel="stylesheet">
    <title>Hidden Mood</title>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">

    @vite(['public/css/app.css', 'public/js/app.js'])

</head>
<body class="bg-gray-50">
    
    @include('layouts.navbar')

    <main>
        @yield('content')
    </main>
    
    <footer class="bg-white mt-10 p-4 text-center">
        <p>&copy; 2025 CC25-CF050 | DBS Coding Camp | All Rights Reserved</p>
    </footer>
</body>
</html>
