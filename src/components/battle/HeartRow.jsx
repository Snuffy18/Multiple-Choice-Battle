export function HeartRow({ hearts, max, shaking = false }) {
  return (
    <div className={`flex gap-1 justify-center ${shaking ? 'animate-shake' : ''}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`text-xl transition-all duration-300 ${
            i < hearts ? 'text-crimson drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'opacity-20 grayscale'
          }`}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}
