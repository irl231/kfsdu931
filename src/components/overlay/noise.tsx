import noiseImage from "@assets/img/noise.webp";

export const Noise: React.FC = () => {
  return (
    <div
      id="noise"
      className="pointer-events-none visible fixed -inset-[50%] z-70 block h-[200vh] w-[150%] bg-repeat opacity-50"
      style={{ backgroundImage: `url(${noiseImage})` }}
    />
  );
};
