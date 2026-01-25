export const TabPanel = ({ isActive }: { isActive: boolean }) => {
  return (
    <div
      className={`absolute z-10 top-0 left-0 w-full h-full min-w-[48px] max-h-[32px] rounded-t-[10px] ${isActive ? "bg-[#202224] z-30" : "bg-[#17191a]"} group-hover:bg-[#292c2f] group-hover:z-20`}
    >
      {/** biome-ignore lint/a11y/noSvgWithoutTitle: suppress warning */}
      <svg
        className={`absolute ${isActive ? "fill-[#202224]" : "fill-[#17191a]"} group-hover:fill-[#292c2f] w-[21px] top-0 right-[-11px]`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 21 32"
      >
        <rect
          className="fill-none"
          id="Artboard1"
          x="0"
          y="0"
          width="20.009"
          height="32"
        />
        <g transform="matrix(1,0,0,1,-2,0)">
          <path d="M2,0C7.486,-0 12,4.514 12,10L12,22C12,27.486 16.514,32 22,32C22.486,32 2,32 2,32L2,0Z" />
        </g>
      </svg>
      {/** biome-ignore lint/a11y/noSvgWithoutTitle: suppress warning */}
      <svg
        className={`absolute ${isActive ? "fill-[#202224]" : "fill-[#17191a]"} group-hover:fill-[#292c2f] w-[21px] top-0 left-[-9px]`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 21 32"
      >
        <rect
          className="fill-none"
          id="Artboard1"
          x="0"
          y="0"
          width="20.009"
          height="32"
        />
        <g transform="matrix(-1,0,0,1,21,0)">
          <path
            xmlns="http://www.w3.org/2000/svg"
            d="M2,0C7.486,-0 12,4.514 12,10L12,22C12,27.486 16.514,32 22,32C22.486,32 2,32 2,32L2,0Z"
          />
        </g>
      </svg>
    </div>
  );
};
