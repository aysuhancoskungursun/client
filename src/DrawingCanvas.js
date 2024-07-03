import React, { useRef, useEffect } from 'react';

function DrawingCanvas({ socket, sessionId, isFirstUser, countdown }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;

        let drawing = false; // Çizim işleminin aktif olup olmadığını kontrol eder

        // Çizime başlama fonksiyonu
        const startDrawing = (e) => {
            if (!isFirstUser) return; // Sadece ilk kullanıcı çizebilir
            drawing = true;
            draw(e);
        };

        // Çizimi bitirme fonksiyonu
        const endDrawing = () => {
            drawing = false;
            context.beginPath(); // Yeni bir çizim yolu başlatır
        };

        // Çizim fonksiyonu
        const draw = (e) => {
            if (!drawing || !isFirstUser) return; // Sadece ilk kullanıcı ve çizim aktifken çalışır
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);

            context.lineWidth = 5;
            context.lineCap = 'round';
            context.strokeStyle = 'black';

            context.lineTo(x, y); // Çizim yapar
            context.stroke();
            context.beginPath();
            context.moveTo(x, y);

            // Çizim verilerini WebSocket üzerinden gönderir
            socket.emit('drawing', { sessionId, drawingData: { x, y, drawing } });
        };

        // WebSocket üzerinden gelen çizim verilerini işler
        const drawFromStream = (data) => {
            if (!data.drawing) return;
            context.lineTo(data.x, data.y);
            context.stroke();
            context.beginPath();
            context.moveTo(data.x, data.y);
        };

        // Piksel bazlı çizim verilerini işler 
        const drawFromPixelatedStream = (data) => {
            if (!data.drawing) return;
            const pixelSize = 10;
            context.fillStyle = 'black';
            context.fillRect(data.x, data.y, pixelSize, pixelSize);
        };

        // Socket.io olaylarını dinler
        socket.on('drawing', drawFromStream);
        socket.on('pixelatedDrawing', drawFromPixelatedStream);

        // Canvas olay dinleyicilerini ekler
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup', endDrawing);
        canvas.addEventListener('mousemove', draw);

        return () => {
            // Canvas olay dinleyicilerini temizler
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mouseup', endDrawing);
            canvas.removeEventListener('mousemove', draw);
            socket.off('drawing', drawFromStream);
            socket.off('pixelatedDrawing', drawFromPixelatedStream);
        };
    }, [socket, isFirstUser]); // Bu effect sadece `socket` veya `isFirstUser` değiştiğinde çalışır

    return (
        <div>
            {/* Geri sayım ekranı, geri sayım süresi sıfırdan büyük ve ilk kullanıcı değilse gösterilir */}
            {countdown > 0 && !isFirstUser && (
                <div className="countdown-overlay">
                    <div className="countdown">{countdown}</div>
                </div>
            )}
            {/* Çizim canvas'ı */}
            <canvas ref={canvasRef} style={{ border: '2px solid black' }}></canvas>
        </div>
    );
}

export default DrawingCanvas;