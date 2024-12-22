export type TSide = "left" | "top" | "right" | "bottom";

// Margin from container
const containerMargin = 8;

// Margin from the screen/edges
const screenMargin = 10;

export type TPosition = ReturnType<typeof corrigerPosition>;

export default function corrigerPosition(
    container: HTMLElement, // button
    popover: HTMLElement,   // popover
    preferredSide: TSide = "bottom",
    frame?: HTMLElement | null // body or closest positioned ancestor
) {
    // Dimensions
    const popoverDims = {
        width: popover.offsetWidth,
        height: popover.offsetHeight,
    };
    const containerRect = container.getBoundingClientRect();

    // Find frame if not provided
    if (!frame) {
        // Find the closest relative-positioned or sticky-positioned parent
        frame = container.parentElement;
        while (frame && !["relative", "sticky"].includes(getComputedStyle(frame).position)) {
            frame = frame.parentElement;
        }
        if (!frame) frame = document.body;
    }

    const frameRect = frame.getBoundingClientRect();
    const frameContRect = document.body.getBoundingClientRect();
    const frameOffsetTop = frame.scrollTop;
    const frameOffsetLeft = frame.scrollLeft;

    // Calculate available space (relative to the document body) around the container
    const space = {
        top: containerRect.top - frameContRect.top,
        bottom: frameContRect.bottom - containerRect.bottom,
        left: containerRect.left - frameContRect.left,
        right: frameContRect.right - containerRect.right,
    };

    // Helper to check if the popover can fit on a given side without clipping
    const canFit = (side: TSide) => {
        switch (side) {
            case "top":
                return space.top >= popoverDims.height;
            case "bottom":
                return space.bottom >= popoverDims.height;
            case "left":
                return space.left >= popoverDims.width;
            case "right":
                return space.right >= popoverDims.width;
        }
    };

    // Start with the preferred side; if it doesn't fit, pick the first side that fits
    let side: TSide = preferredSide;
    if (!canFit(preferredSide)) {
        if (canFit("top")) side = "top";
        else if (canFit("bottom")) side = "bottom";
        else if (canFit("left")) side = "left";
        else if (canFit("right")) side = "right";
    }

    // Calculate initial position (without screen-margin clamping)
    const position = { top: 0, left: 0 };

    if (side === "top") {
        position.top =
            containerRect.top -
            frameRect.top -
            popoverDims.height +
            frameOffsetTop -
            containerMargin; // gap above container

        position.left =
            containerRect.left -
            frameRect.left +
            (containerRect.width - popoverDims.width) / 2 +
            frameOffsetLeft;
    } else if (side === "bottom") {
        position.top =
            containerRect.bottom -
            frameRect.top +
            frameOffsetTop +
            containerMargin; // gap below container

        position.left =
            containerRect.left -
            frameRect.left +
            (containerRect.width - popoverDims.width) / 2 +
            frameOffsetLeft;
    } else if (side === "left") {
        position.top =
            containerRect.top -
            frameRect.top +
            (containerRect.height - popoverDims.height) / 2 +
            frameOffsetTop;

        position.left =
            containerRect.left -
            frameRect.left -
            popoverDims.width +
            frameOffsetLeft -
            containerMargin; // gap to the left of container
    } else if (side === "right") {
        position.top =
            containerRect.top -
            frameRect.top +
            (containerRect.height - popoverDims.height) / 2 +
            frameOffsetTop;

        position.left =
            containerRect.right -
            frameRect.left +
            frameOffsetLeft +
            containerMargin; // gap to the right of container
    }

    // Clamp the final position to ensure a screenMargin from edges
    position.top = Math.max(
        frameOffsetTop + screenMargin,
        Math.min(
            frameContRect.height - popoverDims.height + frameOffsetTop - screenMargin,
            position.top
        )
    );
    position.left = Math.max(
        frameOffsetLeft + screenMargin,
        Math.min(
            frameContRect.width - popoverDims.width + frameOffsetLeft - screenMargin,
            position.left
        )
    );

    // Return the final side and position
    return {
        side,
        css: {
            top: `${position.top}px`,
            left: `${position.left}px`,
        },
    };
}
