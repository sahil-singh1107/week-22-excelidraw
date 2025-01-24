import { Tool } from "@/components/Canvas";
import { getExistingShapes } from "./http";

type Shape = {
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor: string;
    input: HTMLInputElement
} | {
    type: "circle";
    centerX: number;
    centerY: number;
    radius: number;
    backgroundColor: string
} | {
    type: "pencil";
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string
} | null

export class Game {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private existingShapes: Shape[]
    private roomId: string;
    private clicked: boolean;
    private startX = 0;
    private startY = 0;
    private draggedShape: Shape
    private selectedTool: Tool = "circle";
    private color: string
    private eraserPath: [number, number][]

    socket: WebSocket;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.existingShapes = [];
        this.roomId = roomId;
        this.socket = socket;
        this.clicked = false;
        this.draggedShape = null
        this.eraserPath = []
        this.color = "red"
        this.init();
        this.initHandlers();
        this.initMouseHandlers();
    }

    destroy() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler)

        this.canvas.removeEventListener("mouseup", this.mouseUpHandler)

        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler)
    }

    setTool(tool: "circle" | "pencil" | "rect" | "grab" | "eraser") {
        this.selectedTool = tool;
    }

    setColor(color: string) {
        this.color = color
    }

    async init() {
        this.existingShapes = await getExistingShapes(this.roomId);
        console.log(this.existingShapes);
        this.clearCanvas();
    }

    checkIfShapeExists(shape: Shape) {
        return this.existingShapes.indexOf(shape) !== -1;
    }

    initHandlers() {
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type == "chat") {
                const parsedShape = JSON.parse(message.message)
                if (this.checkIfShapeExists(parsedShape.shape)) this.existingShapes.push(parsedShape.shape)
                this.clearCanvas();
            }
            if (message.type === "update_shapes") {
                this.existingShapes = message.data
                this.clearCanvas();
            }
        }
    }

    clearCanvas() {
        console.log(this.existingShapes);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "rgba(0, 0, 0)"
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.existingShapes.map((shape) => {
            if (!shape) return;
            if (shape.type === "rect") {
                this.ctx.fillStyle = shape.backgroundColor;
                this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            } else if (shape.type === "circle") {
                console.log(shape);
                this.ctx.fillStyle = shape.backgroundColor
                this.ctx.beginPath();
                this.ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.closePath();
            } else if (shape.type === "pencil") {
                this.ctx.fillStyle = shape.color
                this.ctx.beginPath();
                this.ctx.moveTo(shape.startX, shape.startY);
                this.ctx.lineTo(shape.endX, shape.endY);
                this.ctx.stroke();
            }
        })
    }

    findDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
    }

    isPointInRect(x: number, y: number, shape: Shape): boolean {
        if (!shape || shape.type !== "rect") return false;
        return (
            x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height
        )
    }

    isPointInCircle(x: number, y: number, shape: Shape): boolean {
        if (!shape || shape.type !== "circle") return false
        return (
            this.findDistance(x, y, shape.centerX, shape.centerY) <= shape.radius
        )
    }

    isPointInLine(x: number, y: number, shape: Shape): boolean {
        if (!shape || shape.type !== "pencil") return false;
        return (
            x >= shape.startX && x <= shape.endX && y >= shape.startY && y <= shape.endY
        )
    }

    mouseDownHandler = (e: MouseEvent) => {
        this.clicked = true
        this.startX = e.clientX
        this.startY = e.clientY
        if (this.selectedTool === "grab") {
            for (const shape of this.existingShapes) {
                if (this.isPointInRect(e.clientX, e.clientY, shape) || this.isPointInCircle(e.clientX, e.clientY, shape)) {
                    this.draggedShape = shape
                    break
                }
            }
        }
        if (this.selectedTool === "eraser") {
            this.eraserPath.push([e.clientX, e.clientY]);
        }
    }

    mouseUpHandler = (e: MouseEvent) => {
        this.clicked = false
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;

        const selectedTool = this.selectedTool;
        let shape: Shape | null = null;
        if (selectedTool === "rect" && this.startX !== -1 && this.startY !== -1 && width > 10 && height > 10) {
            const input = document.createElement("input");
            input.style.position = "absolute"
            input.style.left = `${this.startX + 5}px`
            input.style.top = `${this.startY + 5}px`
            input.style.width = `${width - 5}px`
            input.style.border = "0"
            input.style.outline = "none"
            input.style.alignItems = "center"
            input.style.border = "none"
            input.style.backgroundColor = this.color
            input.style.color = "white"
            document.body.appendChild(input);
            shape = {
                type: "rect",
                x: this.startX,
                y: this.startY,
                height,
                width,
                backgroundColor: this.color,
                input: input
            }
        } else if (selectedTool === "circle") {
            const radius = Math.max(width, height) / 2;
            shape = {
                type: "circle",
                radius: radius,
                centerX: this.startX + radius,
                centerY: this.startY + radius,
                backgroundColor: this.color
            }
        } else if (selectedTool === "eraser") {
            const updatedShapes: Shape[] = [];

            this.existingShapes.map((shape) => {
                if (!shape) return;

                const isErased = this.eraserPath.some((point) => {
                    if (shape.type === "rect" && this.isPointInRect(point[0], point[1], shape)) {
                        if (shape.input && shape.input.parentElement) {
                            shape.input.parentElement.removeChild(shape.input);
                        }
                        return true;
                    }
                    if (shape.type === "circle" && this.isPointInCircle(point[0], point[1], shape)) {
                        return true;
                    }
                    if (shape.type === "pencil" && this.isPointInLine(point[0], point[1], shape)) {
                        return true;
                    }
                    return false;
                });

                if (!isErased) {
                    updatedShapes.push(shape);
                }
            });

            this.existingShapes = updatedShapes;
            this.socket.send(JSON.stringify({
                type: "update_shapes",
                data: this.existingShapes
            }))
            this.clearCanvas();
        } else if (selectedTool === "pencil") {
            shape = {
                type: "pencil",
                startX: this.startX,
                startY: this.startY,
                endX: e.clientX,
                endY: e.clientY,
                color: this.color
            }
        } else if (selectedTool === "grab") {
            this.draggedShape = null
        }

        if (!shape) {
            return;
        }

        this.eraserPath = []

        this.existingShapes.push(shape);

        this.socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify({
                shape
            }),
            roomId: this.roomId
        }))

    }
    mouseMoveHandler = (e: MouseEvent) => {
        if (this.clicked) {
            const width = e.clientX - this.startX;
            const height = e.clientY - this.startY;
            this.clearCanvas();
            this.ctx.strokeStyle = "rgba(255, 255, 255)"
            const selectedTool = this.selectedTool;
            console.log(selectedTool)
            if (selectedTool === "rect") {
                this.ctx.fillStyle = this.color
                this.ctx.strokeRect(this.startX, this.startY, width, height);
                this.ctx.fillRect(this.startX, this.startY, width, height);
            } else if (selectedTool === "circle") {
                this.ctx.fillStyle = this.color
                const radius = Math.max(width, height) / 2;
                const centerX = this.startX + radius;
                const centerY = this.startY + radius;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.strokeStyle = this.color
                this.ctx.closePath();
            } else if (selectedTool === "pencil") {
                this.ctx.fillStyle = this.color
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(e.clientX, e.clientY);
                this.ctx.stroke();
                this.ctx.strokeStyle = this.color
            }
            else if (selectedTool === "grab" && this.draggedShape) {
                if (this.draggedShape.type === "rect") {
                    const x1 = (2 * e.clientX - this.draggedShape.width) / 2, y1 = (2 * e.clientY - this.draggedShape.height) / 2;
                    this.draggedShape.x = x1
                    this.draggedShape.y = y1
                    this.draggedShape.input.style.left = `${x1 + 5}px`
                    this.draggedShape.input.style.top = `${y1 + 5}px`
                }
                if (this.draggedShape.type === "circle") {
                    this.draggedShape.centerX = e.clientX, this.draggedShape.centerY = e.clientY;
                }
                this.socket.send(JSON.stringify({
                    type: "update_shapes",
                    data: this.existingShapes
                }))
            }
            else if (selectedTool === "eraser") {
                this.eraserPath.push([e.clientX, e.clientY]);
            }
        }
    }

    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler)

        this.canvas.addEventListener("mouseup", this.mouseUpHandler)

        this.canvas.addEventListener("mousemove", this.mouseMoveHandler)

    }
}