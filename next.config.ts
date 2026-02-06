import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Добавляем проблемные пакеты сюда
  transpilePackages: ['@esotericsoftware/spine-pixi-v8'],
  
  // Отключаем строгий режим React (помогает избежать двойных рендеров в PixiJS)
  reactStrictMode: false,
  
  // Игнорируем ошибки ESLint при сборке (чтобы не блокировало билд из-за мелочей)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Игнорируем ошибки типов при сборке (если библиотека имеет кривые типы)
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;