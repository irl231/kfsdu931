import { motion } from "motion/react";
import { useEffect, useState } from "react";

export const BackgroundImage: React.FC<{ src: string }> = ({ src }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      return;
    }

    const img = new window.Image();
    img.src = src;

    let mounted = true;
    const handleLoad = () => {
      if (mounted) setLoaded(true);
    };

    if (img.complete) {
      if (mounted) setLoaded(true);
    } else {
      img.addEventListener("load", handleLoad, { once: true });
    }

    return () => {
      mounted = false;
      img.removeEventListener("load", handleLoad);
    };
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
