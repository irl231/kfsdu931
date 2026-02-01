import { useCallback, useEffect, useRef, useState } from "react";
import Swiper from "swiper";
import { Autoplay, Mousewheel } from "swiper/modules";
import type { Swiper as SwiperInstance, SwiperOptions } from "swiper/types";

import "swiper/swiper-bundle.css";

import { GAMES } from "../../constants";
import { GalleryCard } from "../game";

interface GamesSwiperProps {
  onSelectGame: (gameId: string) => void;
}

export function GamesSwiper({ onSelectGame }: GamesSwiperProps) {
  const swiperContainerRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserHovering, setIsUserHovering] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  // Get the first visible slide index (real index in loop mode)
  const getFirstVisibleRealIndex = useCallback(() => {
    if (!swiperRef.current) return 0;
    return swiperRef.current.realIndex;
  }, []);

  useEffect(() => {
    const swiperOptions: SwiperOptions = {
      modules: [Autoplay, Mousewheel],
      slidesPerView: 1,
      spaceBetween: 16,
      loop: true,
      breakpoints: {
        768: {
          slidesPerView: 3,
        },
        1280: {
          slidesPerView: 4,
        },
      },
      mousewheel: {
        forceToAxis: true,
      },
      grabCursor: true,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: false,
      },
      on: {
        slideChange: (swiper) => {
          setActiveIndex(swiper.realIndex);
        },
      },
    };

    if (swiperContainerRef.current) {
      swiperRef.current = new Swiper(swiperContainerRef.current, swiperOptions);
    }

    return () => {
      if (swiperRef.current) {
        swiperRef.current.destroy(true, true);
        swiperRef.current = null;
      }
    };
  }, []);

  const handleCardHoverChange = useCallback(
    (cardIndex: number, isHovered: boolean) => {
      if (isHovered) {
        setIsUserHovering(true);
        setHoveredCardIndex(cardIndex);
        swiperRef.current?.autoplay?.stop();
      } else {
        setIsUserHovering(false);
        setHoveredCardIndex(null);
        // Small delay before resuming autoplay to prevent flickering
        setTimeout(() => {
          if (!swiperRef.current) return;
          // Update active index to current first visible slide
          setActiveIndex(getFirstVisibleRealIndex());
          swiperRef.current?.autoplay?.start();
        }, 100);
      }
    },
    [getFirstVisibleRealIndex],
  );

  // Determine which card should show as active
  const getIsCardActive = useCallback(
    (cardIndex: number) => {
      if (isUserHovering) {
        // When user is hovering, only the hovered card is active
        return cardIndex === hoveredCardIndex;
      }
      // When autoplay is running, the first visible card (realIndex) is active
      return cardIndex === activeIndex;
    },
    [isUserHovering, hoveredCardIndex, activeIndex],
  );

  return (
    <div className="flex-shrink-0 w-full bg-app-primary border-t border-white/5 z-20 relative">
      {/* Left fade gradient */}
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-app-primary to-transparent z-10 pointer-events-none" />

      {/* Right fade gradient */}
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-app-primary to-transparent z-10 pointer-events-none" />

      <div className="w-full pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-10 relative">
        <div
          ref={swiperContainerRef}
          className="swiper px-4 sm:px-6 md:px-10 !overflow-visible"
        >
          <div className="swiper-wrapper !overflow-visible">
            {GAMES.map((game, index) => (
              <GalleryCard
                key={game.id}
                game={game}
                index={index}
                onClick={() => onSelectGame(game.id)}
                className={`shadow-[5px_10px_20px_0px_var(--bg-secondary)] swiper-slide ${getIsCardActive(index) ? "relative z-20" : ""}`}
                isActive={getIsCardActive(index)}
                onHoverChange={(isHovered) =>
                  handleCardHoverChange(index, isHovered)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
