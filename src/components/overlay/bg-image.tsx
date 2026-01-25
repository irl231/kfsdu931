import { motion } from "motion/react";
import { useEffect, useState } from "react";

export const BackgroundImage: React.FC<{ src: string }> = ({ src }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
  }, [src]);

  return (
    <motion.div
      className="absolute inset-0 bg-cover bg-center"
      initial={{ opacity: 0, scale: 1.15, filter: "blur(10px)" }}
      animate={{
        opacity: loaded ? 1 : 0,
        scale: loaded ? 1 : 1.15,
        filter: loaded ? "blur(0px)" : "blur(10px)",
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{
        backgroundImage: `url(${src})`,
        transformOrigin: "center right",
      }}
    />
  );
};
