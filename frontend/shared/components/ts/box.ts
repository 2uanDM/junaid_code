import { BoxProperty } from "../../utils/constants";

const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max);

function setAlpha(rgbColor: string, alpha: number) {
  if (rgbColor.startsWith("rgba")) {
    return rgbColor.replace(/[\d.]+$/, alpha.toString());
  }
  const matches = rgbColor.match(/\d+/g);
  if (!matches || matches.length !== 3) {
    return `rgba(50, 50, 50, ${alpha})`;
  }
  const [r, g, b] = matches;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default class Box {
  label: string;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  color: string;
  alpha: number;
  isDragging: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isCreating: boolean;
  offsetMouseX: number;
  offsetMouseY: number;
  resizeHandleSize: number;
  resizingHandleIndex: number;
  minSize: number;
  renderCallBack: () => void;
  onFinishCreation: () => void;
  canvasXmin: number;
  canvasYmin: number;
  canvasXmax: number;
  canvasYmax: number;
  scaleFactor: number;
  thickness: number;
  selectedThickness: number;
  creatingAnchorX: string;
  creatingAnchorY: string;
  resizeHandles: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    cursor: string;
  }[];
  calibration_ratio: [number, number];

  constructor(
    renderCallBack: () => void, // draw
    onFinishCreation: () => void, // onFinishCreation
    canvasXmin: number,
    canvasYmin: number,
    canvasXmax: number,
    canvasYmax: number,
    label: string, // ""
    xmin: number, // x
    ymin: number, // y
    xmax: number, // x
    ymax: number, // y
    color: string = BoxProperty.Color,
    alpha: number = BoxProperty.Alpha,
    minSize: number = BoxProperty.MinSize, // boxMinSize
    handleSize: number = BoxProperty.HandleSize, // handleSize (dot when click on it to resize)
    thickness: number = BoxProperty.Thickness,
    selectedThickness: number = BoxProperty.SelectedThickness,
    scaleFactor: number = BoxProperty.ScaleFactor,
    calibration_ratio: [number, number] = [0, 0]
  ) {
    this.renderCallBack = renderCallBack;
    this.onFinishCreation = onFinishCreation;
    this.canvasXmin = canvasXmin;
    this.canvasYmin = canvasYmin;
    this.canvasXmax = canvasXmax;
    this.canvasYmax = canvasYmax;
    this.scaleFactor = scaleFactor;
    this.label = label;
    this.isDragging = false;
    this.isCreating = false;
    this.xmin = xmin;
    this.ymin = ymin;
    this.xmax = xmax;
    this.ymax = ymax;
    this.isResizing = false;
    this.isSelected = false;
    this.offsetMouseX = 0;
    this.offsetMouseY = 0;
    this.resizeHandleSize = handleSize;
    this.thickness = thickness;
    this.selectedThickness = selectedThickness;
    this.updateHandles();
    this.resizingHandleIndex = -1;
    this.minSize = minSize;
    this.color = color;
    this.alpha = alpha;
    this.creatingAnchorX = "xmin";
    this.creatingAnchorY = "ymin";
    this.calibration_ratio = calibration_ratio;
  }

  toJSON() {
    return {
      label: this.label,
      xmin: this.xmin,
      ymin: this.ymin,
      xmax: this.xmax,
      ymax: this.ymax,
      color: this.color,
      scaleFactor: this.scaleFactor,
    };
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected;
  }

  setScaleFactor(scaleFactor: number) {
    let scale = scaleFactor / this.scaleFactor;
    this.xmin = Math.round(this.xmin * scale);
    this.ymin = Math.round(this.ymin * scale);
    this.xmax = Math.round(this.xmax * scale);
    this.ymax = Math.round(this.ymax * scale);
    this.updateHandles();
    this.scaleFactor = scaleFactor;
  }

  updateHandles(): void {
    const halfSize = this.resizeHandleSize / 2;
    const width = this.getWidth();
    const height = this.getHeight();
    this.resizeHandles = [
      {
        // Top left
        xmin: this.xmin - halfSize,
        ymin: this.ymin - halfSize,
        xmax: this.xmin + halfSize,
        ymax: this.ymin + halfSize,
        cursor: "nwse-resize",
      },
      {
        // Top right
        xmin: this.xmax - halfSize,
        ymin: this.ymin - halfSize,
        xmax: this.xmax + halfSize,
        ymax: this.ymin + halfSize,
        cursor: "nesw-resize",
      },
      {
        // Bottom right
        xmin: this.xmax - halfSize,
        ymin: this.ymax - halfSize,
        xmax: this.xmax + halfSize,
        ymax: this.ymax + halfSize,
        cursor: "nwse-resize",
      },
      {
        // Bottom left
        xmin: this.xmin - halfSize,
        ymin: this.ymax - halfSize,
        xmax: this.xmin + halfSize,
        ymax: this.ymax + halfSize,
        cursor: "nesw-resize",
      },
      {
        // Top center
        xmin: this.xmin + width / 2 - halfSize,
        ymin: this.ymin - halfSize,
        xmax: this.xmin + width / 2 + halfSize,
        ymax: this.ymin + halfSize,
        cursor: "ns-resize",
      },
      {
        // Right center
        xmin: this.xmax - halfSize,
        ymin: this.ymin + height / 2 - halfSize,
        xmax: this.xmax + halfSize,
        ymax: this.ymin + height / 2 + halfSize,
        cursor: "ew-resize",
      },
      {
        // Bottom center
        xmin: this.xmin + width / 2 - halfSize,
        ymin: this.ymax - halfSize,
        xmax: this.xmin + width / 2 + halfSize,
        ymax: this.ymax + halfSize,
        cursor: "ns-resize",
      },
      {
        // Left center
        xmin: this.xmin - halfSize,
        ymin: this.ymin + height / 2 - halfSize,
        xmax: this.xmin + halfSize,
        ymax: this.ymin + height / 2 + halfSize,
        cursor: "ew-resize",
      },
    ];
  }

  getWidth(): number {
    return this.xmax - this.xmin;
  }

  getHeight(): number {
    return this.ymax - this.ymin;
  }

  getArea(): number {
    return this.getWidth() * this.getHeight();
  }

  toCanvasCoordinates(x: number, y: number): [number, number] {
    x = x + this.canvasXmin;
    y = y + this.canvasYmin;
    return [x, y];
  }

  toBoxCoordinates(x: number, y: number): [number, number] {
    x = x - this.canvasXmin;
    y = y - this.canvasYmin;
    return [x, y];
  }

  render(ctx: CanvasRenderingContext2D): void {
    let xmin: number, ymin: number;

    // Render the box and border
    ctx.beginPath();

    [xmin, ymin] = this.toCanvasCoordinates(this.xmin, this.ymin);

    ctx.rect(
      xmin / this.scaleFactor,
      ymin / this.scaleFactor,
      this.getWidth() / this.scaleFactor,
      this.getHeight() / this.scaleFactor
    );
    ctx.fillStyle = setAlpha(this.color, this.alpha);
    ctx.fill();
    if (this.isSelected) {
      ctx.lineWidth = this.selectedThickness;
    } else {
      ctx.lineWidth = this.thickness;
    }
    ctx.strokeStyle = setAlpha(this.color, 1);

    ctx.stroke();
    ctx.closePath();

    // Render the handles
    ctx.fillStyle = setAlpha(this.color, 1);
    for (const handle of this.resizeHandles) {
      [xmin, ymin] = this.toCanvasCoordinates(handle.xmin, handle.ymin);
      ctx.fillRect(
        xmin / this.scaleFactor,
        ymin / this.scaleFactor,
        (handle.xmax - handle.xmin) / this.scaleFactor,
        (handle.ymax - handle.ymin) / this.scaleFactor
      );
    }

    // Panel to show the real width and height of the box
    if (
      this.isCreating &&
      this.calibration_ratio[0] > 0 &&
      this.calibration_ratio[1] > 0
    ) {
      const realWidth =
        (this.getWidth() / this.scaleFactor) * this.calibration_ratio[0];
      const realHeight =
        (this.getHeight() / this.scaleFactor) * this.calibration_ratio[1];

      const panelX = (this.xmin + this.getWidth() + 5) / this.scaleFactor;
      const panelY = (this.ymin + this.getHeight() + 5) / this.scaleFactor;

      const panelWidth = 120 / this.scaleFactor;
      const panelHeight = 50 / this.scaleFactor;

      ctx.fillStyle = "white";
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

      // Write the real width and height on the panel
      ctx.fillStyle = "black";

      const fontSize = parseInt((15.0 / this.scaleFactor).toString());
      ctx.font = `${fontSize}px Arial`;
      ctx.fillText(
        `Width: ${realWidth.toFixed(2)} mm`,
        panelX + 5 / this.scaleFactor,
        panelY + 20 / this.scaleFactor
      );
      ctx.fillText(
        `Height: ${realHeight.toFixed(2)} mm`,
        panelX + 5 / this.scaleFactor,
        panelY + 40 / this.scaleFactor
      );
    }
  }

  startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.offsetMouseX = event.clientX - this.xmin;
    this.offsetMouseY = event.clientY - this.ymin;
    document.addEventListener("pointermove", this.handleDrag);
    document.addEventListener("pointerup", this.stopDrag);
  }

  stopDrag = (): void => {
    this.isDragging = false;
    document.removeEventListener("pointermove", this.handleDrag);
    document.removeEventListener("pointerup", this.stopDrag);
  };

  handleDrag = (event: MouseEvent): void => {
    if (this.isDragging) {
      let deltaX = event.clientX - this.offsetMouseX - this.xmin;
      let deltaY = event.clientY - this.offsetMouseY - this.ymin;
      const canvasW = this.canvasXmax - this.canvasXmin;
      const canvasH = this.canvasYmax - this.canvasYmin;
      deltaX = clamp(deltaX, -this.xmin, canvasW - this.xmax);
      deltaY = clamp(deltaY, -this.ymin, canvasH - this.ymax);
      this.xmin += deltaX;
      this.ymin += deltaY;
      this.xmax += deltaX;
      this.ymax += deltaY;
      this.updateHandles();
      this.renderCallBack();
    }
  };

  isPointInsideBox(x: number, y: number): boolean {
    [x, y] = this.toBoxCoordinates(x, y);
    return x >= this.xmin && x <= this.xmax && y >= this.ymin && y <= this.ymax;
  }

  indexOfPointInsideHandle(x: number, y: number): number {
    [x, y] = this.toBoxCoordinates(x, y);
    for (let i = 0; i < this.resizeHandles.length; i++) {
      const handle = this.resizeHandles[i];
      if (
        x >= handle.xmin &&
        x <= handle.xmax &&
        y >= handle.ymin &&
        y <= handle.ymax
      ) {
        this.resizingHandleIndex = i;
        return i;
      }
    }
    return -1;
  }

  startCreating(event: MouseEvent, canvasX: number, canvasY: number): void {
    this.isCreating = true;
    this.offsetMouseX = canvasX;
    this.offsetMouseY = canvasY;
    document.addEventListener("pointermove", this.handleCreating);
    document.addEventListener("pointerup", this.stopCreating);
  }

  handleCreating = (event: MouseEvent): void => {
    if (this.isCreating) {
      let [x, y] = this.toBoxCoordinates(event.clientX, event.clientY);
      x -= this.offsetMouseX;
      y -= this.offsetMouseY;

      if (x > this.xmax) {
        if (this.creatingAnchorX == "xmax") {
          this.xmin = this.xmax;
        }
        this.xmax = x;
        this.creatingAnchorX = "xmin";
      } else if (
        x > this.xmin &&
        x < this.xmax &&
        this.creatingAnchorX == "xmin"
      ) {
        this.xmax = x;
      } else if (
        x > this.xmin &&
        x < this.xmax &&
        this.creatingAnchorX == "xmax"
      ) {
        this.xmin = x;
      } else if (x < this.xmin) {
        if (this.creatingAnchorX == "xmin") {
          this.xmax = this.xmin;
        }
        this.xmin = x;
        this.creatingAnchorX = "xmax";
      }

      if (y > this.ymax) {
        if (this.creatingAnchorY == "ymax") {
          this.ymin = this.ymax;
        }
        this.ymax = y;
        this.creatingAnchorY = "ymin";
      } else if (
        y > this.ymin &&
        y < this.ymax &&
        this.creatingAnchorY == "ymin"
      ) {
        this.ymax = y;
      } else if (
        y > this.ymin &&
        y < this.ymax &&
        this.creatingAnchorY == "ymax"
      ) {
        this.ymin = y;
      } else if (y < this.ymin) {
        if (this.creatingAnchorY == "ymin") {
          this.ymax = this.ymin;
        }
        this.ymin = y;
        this.creatingAnchorY = "ymax";
      }

      this.updateHandles();
      this.renderCallBack();
    }
  };

  stopCreating = (event: MouseEvent): void => {
    this.isCreating = false;
    document.removeEventListener("pointermove", this.handleCreating);
    document.removeEventListener("pointerup", this.stopCreating);

    if (this.getArea() > 0) {
      const canvasW = this.canvasXmax - this.canvasXmin;
      const canvasH = this.canvasYmax - this.canvasYmin;
      this.xmin = clamp(this.xmin, 0, canvasW - this.minSize);
      this.ymin = clamp(this.ymin, 0, canvasH - this.minSize);
      this.xmax = clamp(this.xmax, this.minSize, canvasW);
      this.ymax = clamp(this.ymax, this.minSize, canvasH);

      if (this.minSize > 0) {
        if (this.getWidth() < this.minSize) {
          if (this.creatingAnchorX == "xmin") {
            this.xmax = this.xmin + this.minSize;
          } else {
            this.xmin = this.xmax - this.minSize;
          }
        }
        if (this.getHeight() < this.minSize) {
          if (this.creatingAnchorY == "ymin") {
            this.ymax = this.ymin + this.minSize;
          } else {
            this.ymin = this.ymax - this.minSize;
          }
        }
        if (this.xmax > canvasW) {
          this.xmin -= this.xmax - canvasW;
          this.xmax = canvasW;
        } else if (this.xmin < 0) {
          this.xmax -= this.xmin;
          this.xmin = 0;
        }
        if (this.ymax > canvasH) {
          this.ymin -= this.ymax - canvasH;
          this.ymax = canvasH;
        } else if (this.ymin < 0) {
          this.ymax -= this.ymin;
          this.ymin = 0;
        }
      }
      this.updateHandles();
      this.renderCallBack();
    }
    this.onFinishCreation();
  };

  startResize(handleIndex: number, event: MouseEvent): void {
    this.resizingHandleIndex = handleIndex;
    this.isResizing = true;
    this.offsetMouseX = event.clientX - this.resizeHandles[handleIndex].xmin;
    this.offsetMouseY = event.clientY - this.resizeHandles[handleIndex].ymin;
    document.addEventListener("pointermove", this.handleResize);
    document.addEventListener("pointerup", this.stopResize);
  }

  handleResize = (event: MouseEvent): void => {
    if (this.isResizing) {
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      const deltaX =
        mouseX -
        this.resizeHandles[this.resizingHandleIndex].xmin -
        this.offsetMouseX;
      const deltaY =
        mouseY -
        this.resizeHandles[this.resizingHandleIndex].ymin -
        this.offsetMouseY;
      const canvasW = this.canvasXmax - this.canvasXmin;
      const canvasH = this.canvasYmax - this.canvasYmin;
      switch (this.resizingHandleIndex) {
        case 0: // Top-left handle
          this.xmin += deltaX;
          this.ymin += deltaY;
          this.xmin = clamp(this.xmin, 0, this.xmax - this.minSize);
          this.ymin = clamp(this.ymin, 0, this.ymax - this.minSize);
          break;
        case 1: // Top-right handle
          this.xmax += deltaX;
          this.ymin += deltaY;
          this.xmax = clamp(this.xmax, this.xmin + this.minSize, canvasW);
          this.ymin = clamp(this.ymin, 0, this.ymax - this.minSize);
          break;
        case 2: // Bottom-right handle
          this.xmax += deltaX;
          this.ymax += deltaY;
          this.xmax = clamp(this.xmax, this.xmin + this.minSize, canvasW);
          this.ymax = clamp(this.ymax, this.ymin + this.minSize, canvasH);
          break;
        case 3: // Bottom-left handle
          this.xmin += deltaX;
          this.ymax += deltaY;
          this.xmin = clamp(this.xmin, 0, this.xmax - this.minSize);
          this.ymax = clamp(this.ymax, this.ymin + this.minSize, canvasH);
          break;
        case 4: // Top center handle
          this.ymin += deltaY;
          this.ymin = clamp(this.ymin, 0, this.ymax - this.minSize);
          break;
        case 5: // Right center handle
          this.xmax += deltaX;
          this.xmax = clamp(this.xmax, this.xmin + this.minSize, canvasW);
          break;
        case 6: // Bottom center handle
          this.ymax += deltaY;
          this.ymax = clamp(this.ymax, this.ymin + this.minSize, canvasH);
          break;
        case 7: // Left center handle
          this.xmin += deltaX;
          this.xmin = clamp(this.xmin, 0, this.xmax - this.minSize);
          break;
      }
      // Update the resize handles
      this.updateHandles();
      this.renderCallBack();
    }
  };

  stopResize = (): void => {
    this.isResizing = false;
    document.removeEventListener("pointermove", this.handleResize);
    document.removeEventListener("pointerup", this.stopResize);
  };
}
