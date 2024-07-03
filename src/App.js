import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import DrawingCanvas from './DrawingCanvas';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import createGameImg from './assets/images/createGame.png';
import joinGameImg from './assets/images/joinGame.png';

const socket = io('http://localhost:4001');

function App() {
    // State tanımlamaları
    const [username, setUsername] = useState(''); // Kullanıcının adını tutar
    const [correctAnswer, setCorrectAnswer] = useState(''); // Doğru cevabı tutar
    const [sessionId, setSessionId] = useState(''); // Oyun oturumu kimliğini tutar
    const [userId, setUserId] = useState(''); // Kullanıcının kimliğini tutar
    const [isCreatingGame, setIsCreatingGame] = useState(false); // Oyunun oluşturulup oluşturulmadığını belirtir
    const [isJoiningGame, setIsJoiningGame] = useState(false); // Oyuna katılıp katılmadığını belirtir
    const [gameCode, setGameCode] = useState(''); // Katılmak için girilen oyun kodunu tutar
    const [isFirstUser, setIsFirstUser] = useState(false); // İlk kullanıcı olup olmadığını belirtir
    const [guess, setGuess] = useState(''); // Kullanıcının tahminini tutar
    const [guessResult, setGuessResult] = useState(''); // Tahmin sonucunu tutar (doğru/yanlış)
    const [score, setScore] = useState(0); // Kullanıcının skorunu tutar
    const [leaderboard, setLeaderboard] = useState([]); // Lider tablosunu tutar
    const [isGameStarted, setIsGameStarted] = useState(false); // Oyunun başlayıp başlamadığını belirtir
    const [timer, setTimer] = useState(60); // 60 saniyelik sayacı tutar
    const [countdown, setCountdown] = useState(3); // Geri sayım için 3 saniyelik süreyi tutar

    const [showCreateGameInput, setShowCreateGameInput] = useState(false);
    const [showJoinGameInput, setShowJoinGameInput] = useState(false);

    // Oyun başladıysa ve ilk kullanıcı değilse, sayaç başlat
    useEffect(() => {
        let interval;
        if (isGameStarted && !isFirstUser) {
            interval = setInterval(() => {
                setTimer(prevTimer => {
                    if (prevTimer <= 1) {
                        clearInterval(interval);
                        socket.emit('timeUp', { sessionId, userId }); // Süre dolduğunda sunucuya bildirim gönderilir.
                        return 0;
                    }
                    return prevTimer - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isGameStarted, sessionId, userId, isFirstUser]);

    // Geri sayım başlat
    useEffect(() => {
        let interval;
        if (countdown > 0) {
            interval = setInterval(() => {
                setCountdown(prevCountdown => {
                    if (prevCountdown <= 1) {
                        clearInterval(interval);
                        setIsGameStarted(true);
                        return 0;
                    }
                    return prevCountdown - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [countdown]);

    // Yeni oyun oluşturma işlevi
    const handleCreateGame = () => {
        if (username && correctAnswer) {
            setIsCreatingGame(true);
            socket.emit('newSession', { username, correctAnswer });
        } else {
            alert("Please enter a username and the correct answer.");
        }
    };

    // Mevcut bir oyuna katılma işlevi
    const handleJoinGame = () => {
        if (username && gameCode) {
            setIsJoiningGame(true);
            socket.emit('joinSession', { username, gameCode });
        } else {
            alert("Please enter a username and a game code.");
        }
    };

    // Tahmin gönderme işlevi
    const handleGuess = (e) => {
        e.preventDefault();
        if (guess) {
            socket.emit('guess', { sessionId, userId, guess });
            setGuess('');
        } else {
            alert("Please enter a guess.");
        }
    };

    // Socket.io olaylarını dinle
    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId, userId }) => {
            setSessionId(sessionId);
            setUserId(userId);
            setIsFirstUser(true);
            setIsCreatingGame(true);
            setCountdown(3);
        });

        socket.on('joinedSession', ({ sessionId, userId }) => {
            setSessionId(sessionId);
            setUserId(userId);
            setIsJoiningGame(true);
            setCountdown(3);
        });

        socket.on('guessResult', (result) => {
            setGuessResult(result.correct ? "Correct, Congratulations!" : "Try again!");
            if (result.correct) {
                setScore(result.score);
                socket.emit('updateLeaderboard', { sessionId, userId, score: result.score }); // Skor güncellemesini sunucuya gönderir.
            }
        });

        socket.on('newRound', ({ correctAnswer, drawer, nextDrawerId }) => {
            setTimer(60);
            setIsGameStarted(false);
            setCountdown(3);
            setCorrectAnswer('');
            setIsFirstUser(nextDrawerId === userId);
        });

        socket.on('playerJoined', ({ username, userId }) => {
            setLeaderboard(prevLeaderboard => [...prevLeaderboard, { username, score: 0, userId }]);
        });

        socket.on('updateLeaderboard', (leaderboard) => {
            setLeaderboard(leaderboard);
        });

        return () => {
            socket.off('sessionCreated');
            socket.off('joinedSession');
            socket.off('guessResult');
            socket.off('newRound');
            socket.off('playerJoined');
            socket.off('updateLeaderboard');
        };
    }, [userId]);

     // Yeni doğru cevap işlevi
    const handleNewCorrectAnswer = () => {
        if (isFirstUser && correctAnswer) {
            socket.emit('newCorrectAnswer', { sessionId, correctAnswer });
        }
    };

    // Yeni doğru cevap işlevi değiştiğinde çağır
    useEffect(() => {
        if (isFirstUser) {
            handleNewCorrectAnswer();
        }
    }, [correctAnswer]);

    // Oyun kodunu panoya kopyala işlevi
    const copyToClipboard = () => {
        navigator.clipboard.writeText(sessionId).then(() => {
        }, () => {
            alert('Failed to copy Game Code.');
        });
    };

    // Oyun kodunu paylaş işlevi
    const shareGameCode = () => {
        const shareData = {
            title: 'Join my game!',
            text: `Use this code to join my game: ${sessionId}\n${window.location.href}`
        };
        if (navigator.share) {
            navigator.share(shareData).then(() => {
            }).catch((error) => {
                console.error('Error sharing game code:', error);
            });
        } else {
            const shareUrl = `mailto:?subject=Join my game!&body=Use this code to join my game: ${sessionId}\n${window.location.href}`;
            window.open(shareUrl, '_blank');
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Draw & Guess</h1>
            </header>
            <main className="App-main">
                {isCreatingGame || isJoiningGame ? (
                    <div>
                        {isFirstUser ? (
                            <div>
                                <h2>Game started!</h2>
                                <h3>Game Code: {sessionId} <button className='copyBtn' onClick={copyToClipboard}>Copy</button> <button className='shareBtn' onClick={shareGameCode}>Share</button></h3>
                                <h4>The game starts with you! Good luck..</h4>
                                <DrawingCanvas socket={socket} sessionId={sessionId} isFirstUser={isFirstUser} countdown={countdown} />
                                <input
                                    type="text"
                                    placeholder="Correct Answer"
                                    value={correctAnswer}
                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div>
                                {countdown > 0 ? (
                                    <div className="countdown-container">
                                        <p>Starting in: {countdown}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <h2>Game Started</h2>
                                        <div className="timer-container">
                                            <div className="timer-bar" style={{ '--duration': `${timer}s` }}>Remaining Time: {timer} second</div>
                                        </div>
                                        <DrawingCanvas socket={socket} sessionId={sessionId} isFirstUser={isFirstUser} countdown={countdown} />
                                        <form onSubmit={handleGuess}>
                                            <input
                                                type="text"
                                                value={guess}
                                                onChange={(e) => setGuess(e.target.value)}
                                                placeholder="Enter your guess"
                                            />
                                            <button type="submit">Guess</button>
                                        </form>
                                        {guessResult && <p>{guessResult}</p>}
                                        <p>Score: {score}</p>
                                        <h2>Leaderboard</h2>
                                        <ul>
                                            {leaderboard.map((user, index) => (
                                                <li key={index}>{user.username}: {user.score}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (   
                    <div className="container">
                    <div className="row justify-content-center mb-5">
                        <div className="col-md-8 text-center">
                            <div className="alert alert-primary" role="alert">
                                <h2>Welcome!</h2> You will earn points by knowing what others have drawn and you will tell them by drawing the word given to you. Press the "Create Game" button to create a game session. To join an existing game, enter the game code and press the "Join" button.
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 d-flex justify-content-center">
                            <div className='position-relative'>
                                <div className='create-game-card' onClick={() => setShowCreateGameInput(!showCreateGameInput)} style={{ backgroundImage: `url(${createGameImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                </div>
                                {showCreateGameInput && (
                                    <div className='create-game-container'>
                                        <input
                                        type="text"
                                        className="form-control"
                                        id='username'
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Correct Answer"
                                        onChange={(e) => setCorrectAnswer(e.target.value)}
                                        disabled={isJoiningGame} 
                                    />
                                    <button onClick={handleCreateGame}><i className="fa fa-gamepad" aria-hidden="true"></i></button>
                                </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6 d-flex justify-content-center">
                            <div className='position-relative'>
                                <div className='join-game-card' onClick={() => setShowJoinGameInput(!showJoinGameInput)} style={{ backgroundImage: `url(${joinGameImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                </div>
                                {showJoinGameInput && (
                                    <div className="join-game-container">
                                    <input
                                        type="text"
                                        className="form-control"
                                        id='username'
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Game Code"
                                        value={gameCode}
                                        onChange={(e) => setGameCode(e.target.value)}
                                    />
                                    <button onClick={handleJoinGame}><i className="fas fa-sign-in-alt"></i></button>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </main>
        </div>
    );
}

export default App;