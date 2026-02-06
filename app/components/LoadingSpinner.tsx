'use client';

export default function LoadingSpinner() {
  return (
    <div className="mt-8 text-center">
      <div className="w-8 h-8 border-4 border-t-4 border-roxo rounded-full animate-spin mx-auto"></div>
      <p className="mt-2">Carregando...</p>
    </div>
  );
}
