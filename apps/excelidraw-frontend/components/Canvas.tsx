import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Pencil, RectangleHorizontalIcon, HandIcon, Eraser, PaintBucket } from "lucide-react";
import { Game } from "@/draw/Game";

export type Tool = "circle" | "rect" | "pencil" | "grab" | "eraser";

export function Canvas({
    roomId,
    socket
}: {
    socket: WebSocket;
    roomId: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [game, setGame] = useState<Game>();
    const [selectedTool, setSelectedTool] = useState<Tool>("circle")
    const [selectedColor, setSelectedColor] = useState<string>("black");

    useEffect(() => {
        game?.setTool(selectedTool);
        game?.setColor(selectedColor);
    }, [selectedTool, game, selectedColor]);

    useEffect(() => {

        if (canvasRef.current) {
            const g = new Game(canvasRef.current, roomId, socket);
            setGame(g);

            return () => {
                g.destroy();
            }
        }
    }, [canvasRef]);

    return <div style={{
        height: "100vh",
        overflow: "hidden"
    }}>
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}></canvas>
        <Topbar setSelectedTool={setSelectedTool} selectedTool={selectedTool} selectedColor={selectedColor} setSelectedColor={setSelectedColor} />
    </div>
}

function Topbar({ selectedTool, setSelectedTool, selectedColor, setSelectedColor }: {
    selectedTool: Tool,
    setSelectedTool: (s: Tool) => void,
    selectedColor: string,
    setSelectedColor: Dispatch<SetStateAction<string>>
}) {
    return <div style={{
        position: "fixed",
        top: 10,
        left: 10
    }}>
        <div className="flex gap-t items-center">
            <IconButton
                onClick={() => {
                    setSelectedTool("pencil")
                }}
                activated={selectedTool === "pencil"}
                icon={<Pencil />}
            />
            <IconButton onClick={() => {
                setSelectedTool("rect")
            }} activated={selectedTool === "rect"} icon={<RectangleHorizontalIcon />} ></IconButton>
            <IconButton onClick={() => {
                setSelectedTool("circle")
            }} activated={selectedTool === "circle"} icon={<Circle />}></IconButton>
            <IconButton onClick={() => {
                setSelectedTool("grab")
            }} activated={selectedTool === "grab"} icon={<HandIcon />}></IconButton>
            <IconButton onClick={() => {
                setSelectedTool("eraser")
            }} activated={selectedTool === "eraser"} icon={<Eraser />}></IconButton>
            <input type="color" value={selectedColor} className="rounded-full h-10 w-10" onChange={(e) => {
                setSelectedColor(e.target.value)
            }} />
        </div>
    </div>
}