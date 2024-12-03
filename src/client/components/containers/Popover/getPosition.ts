export type TSide = "left" | "top" | "right" | "bottom";

const debug = false;

export type TPosition = ReturnType<typeof corrigerPosition>;

export default function corrigerPosition(
    container: HTMLElement, // button
    popover: HTMLElement, // popover
    preferredSide: TSide = "bottom",
    frame?: HTMLElement // body
) {
    // Dimensions and bounding rectangles
    const popoverDims = { width: popover.offsetWidth, height: popover.offsetHeight };
    const containerRect = container.getBoundingClientRect();

    // Find the frame if not provided
    if (!frame) {
        // Find the closest relative-positioned parent
        frame = container.parentElement;
        while (frame && !["relative", "sticky"].includes(getComputedStyle(frame).position)) {
            frame = frame.parentElement;
        }

        if (!frame) frame = document.body;
    }

    if (debug) console.log("frame", frame);

    const frameRect = frame.getBoundingClientRect();
    const frameOffsetTop = frame.scrollTop;
    const frameOffsetLeft = frame.scrollLeft;

    // Calculate available space in each direction relative to the frame
    const space = {
        top: containerRect.top - frameRect.top,
        bottom: frameRect.bottom - containerRect.bottom,
        left: containerRect.left - frameRect.left,
        right: frameRect.right - containerRect.right,
    };

    // Helper function to check if there's enough space
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

    // Try preferred side first, then fallback
    let side: TSide = preferredSide;
    if (!canFit(preferredSide)) {
        if (canFit("top")) side = "top";
        else if (canFit("bottom")) side = "bottom";
        else if (canFit("left")) side = "left";
        else if (canFit("right")) side = "right";
    }

    // Calculate position based on side
    const position = { top: 0, left: 0 };
    if (side === "top") {
        position.top =
            containerRect.top -
            frameRect.top -
            popoverDims.height +
            frameOffsetTop;
        position.left =
            containerRect.left -
            frameRect.left +
            (containerRect.width - popoverDims.width) / 2 +
            frameOffsetLeft;
    } else if (side === "bottom") {
        position.top =
            containerRect.bottom -
            frameRect.top +
            frameOffsetTop;
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
            frameOffsetLeft;
    } else if (side === "right") {
        position.top =
            containerRect.top -
            frameRect.top +
            (containerRect.height - popoverDims.height) / 2 +
            frameOffsetTop;
        position.left =
            containerRect.right -
            frameRect.left +
            frameOffsetLeft;
    }

    // Adjust for overflow
    position.top = Math.max(
        frameOffsetTop,
        Math.min(frameRect.height - popoverDims.height + frameOffsetTop, position.top)
    );
    position.left = Math.max(
        frameOffsetLeft,
        Math.min(frameRect.width - popoverDims.width + frameOffsetLeft, position.left)
    );

    // Return result
    return {
        side,
        css: {
            top: `${position.top}px`,
            left: `${position.left}px`,
        },
    };
}
