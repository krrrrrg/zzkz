const baseImages = [
    'apple.png', 'btc.png', 'doge.jpeg', 'eth.png', 'pepe.png',
    'pltr.png', 'salor.jpeg', 'sat.png', 'sol.jpeg', 'tsla.png'
];

let gameBoard = [];
let selectedCards = [];
let matchedPairs = 0;
let timeLeft = 300; // 5분
let timerInterval;

// 보드 크기를 10x10으로 변경
const BOARD_SIZE = 10;
const canvas = document.getElementById('lineCanvas');
const ctx = canvas.getContext('2d');

function initCanvas() {
    const boardElement = document.querySelector('.game-board');
    canvas.width = boardElement.offsetWidth;
    canvas.height = boardElement.offsetHeight;
    canvas.style.left = boardElement.offsetLeft + 'px';
    canvas.style.top = boardElement.offsetTop + 'px';
}

function createPairs() {
    const pairs = [];
    // 각 이미지를 정확히 10번씩 반복하여 50쌍 생성
    baseImages.forEach(image => {
        for(let i = 0; i < 10; i++) {
            pairs.push(image, image); // 항상 짝수로 추가
        }
    });
    return pairs;
}

function createBoard() {
    const pairs = createPairs(); // 정확히 100개의 카드 생성
    const shuffled = shuffleArray(pairs);
    gameBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
    
    let cardIndex = 0;
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            gameBoard[i][j] = shuffled[cardIndex++];
        }
    }

    // 짝이 맞는지 확인
    validatePairs();
}

function canConnect(start, end) {
    // 직선 경로 확인
    function checkStraightLine(start, end) {
        if (start.row === end.row) {
            // 가로 방향 확인
            const minCol = Math.min(start.col, end.col);
            const maxCol = Math.max(start.col, end.col);
            for (let col = minCol + 1; col < maxCol; col++) {
                // 보드 바깥은 통과 가능
                if (col >= 0 && col < BOARD_SIZE && 
                    start.row >= 0 && start.row < BOARD_SIZE && 
                    gameBoard[start.row][col] !== null) {
                    return false;
                }
            }
            return true;
        }
        if (start.col === end.col) {
            // 세로 방향 확인
            const minRow = Math.min(start.row, end.row);
            const maxRow = Math.max(start.row, end.row);
            for (let row = minRow + 1; row < maxRow; row++) {
                // 보드 바깥은 통과 가능
                if (row >= 0 && row < BOARD_SIZE && 
                    start.col >= 0 && start.col < BOARD_SIZE && 
                    gameBoard[row][start.col] !== null) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    // 한 번 꺾어서 연결 가능한지 확인
    function checkOneCorner(start, end) {
        // 수직 방향으로 먼저 이동하고 수평 이동
        const corner1 = { 
            row: end.row, 
            col: start.col,
            isOutside: end.row < 0 || end.row >= BOARD_SIZE || start.col < 0 || start.col >= BOARD_SIZE
        };

        // 수평 방향으로 먼저 이동하고 수직 이동
        const corner2 = { 
            row: start.row, 
            col: end.col,
            isOutside: start.row < 0 || start.row >= BOARD_SIZE || end.col < 0 || end.col >= BOARD_SIZE
        };

        // 코너가 보드 바깥이거나 비어있는 경우 통과 가능
        if ((corner1.isOutside || !gameBoard[corner1.row]?.[corner1.col]) && 
            checkStraightLine(start, corner1) && 
            checkStraightLine(corner1, end)) {
            drawPath([start, corner1, end]);
            return true;
        }

        if ((corner2.isOutside || !gameBoard[corner2.row]?.[corner2.col]) && 
            checkStraightLine(start, corner2) && 
            checkStraightLine(corner2, end)) {
            drawPath([start, corner2, end]);
            return true;
        }

        return false;
    }

    // 두 번 꺾어서 연결 가능한지 확인
    function checkTwoCorners(start, end) {
        // 보드 크기보다 2칸 더 넓게 검사
        for (let i = -2; i <= BOARD_SIZE + 1; i++) {
            // 수평 -> 수직 -> 수평
            const corner1 = { row: start.row, col: i };
            const corner2 = { row: end.row, col: i };
            
            // 코너가 보드 바깥이거나 비어있는 경우 통과 가능
            const isCorner1Valid = i < 0 || i >= BOARD_SIZE || !gameBoard[start.row]?.[i];
            const isCorner2Valid = i < 0 || i >= BOARD_SIZE || !gameBoard[end.row]?.[i];
            
            if (isCorner1Valid && isCorner2Valid && 
                checkStraightLine(start, corner1) && 
                checkStraightLine(corner1, corner2) && 
                checkStraightLine(corner2, end)) {
                drawPath([start, corner1, corner2, end]);
                return true;
            }

            // 수직 -> 수평 -> 수직
            const corner3 = { row: i, col: start.col };
            const corner4 = { row: i, col: end.col };
            
            const isCorner3Valid = i < 0 || i >= BOARD_SIZE || !gameBoard[i]?.[start.col];
            const isCorner4Valid = i < 0 || i >= BOARD_SIZE || !gameBoard[i]?.[end.col];
            
            if (isCorner3Valid && isCorner4Valid && 
                checkStraightLine(start, corner3) && 
                checkStraightLine(corner3, corner4) && 
                checkStraightLine(corner4, end)) {
                drawPath([start, corner3, corner4, end]);
                return true;
            }
        }
        return false;
    }

    return checkStraightLine(start, end) || 
           checkOneCorner(start, end) || 
           checkTwoCorners(start, end);
}

function drawPath(path) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;

    const cardSize = 60;  // 카드 크기에 맞춰 조정
    const gap = 5;
    const offsetX = 20;
    const offsetY = 20;

    path.forEach((point, index) => {
        const x = point.col * (cardSize + gap) + cardSize/2 + offsetX;
        const y = point.row * (cardSize + gap) + cardSize/2 + offsetY;
        
        if(index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 500);
}

function handleCardClick(row, col) {
    if(!gameBoard[row][col]) return;
    
    const clickedCard = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    
    if(selectedCards.length === 0) {
        selectedCards.push({row, col, element: clickedCard});
        clickedCard.classList.add('selected');
    } else {
        const firstCard = selectedCards[0];
        
        if(firstCard.row === row && firstCard.col === col) {
            return;
        }

        if(gameBoard[firstCard.row][firstCard.col] === gameBoard[row][col]) {
            if(canConnect(firstCard, {row, col})) {
                gameBoard[firstCard.row][firstCard.col] = null;
                gameBoard[row][col] = null;
                firstCard.element.classList.add('empty');
                clickedCard.classList.add('empty');
                matchedPairs++;
                document.getElementById('matches').textContent = matchedPairs;
                
                // 매칭 가능한 쌍이 있는지 확인
                if(!hasValidMoves()) {
                    reshuffleRemainingCards();
                }
                
                if(matchedPairs === 50) {  // baseImages.length * 5
                    clearInterval(timerInterval);
                    const timeSpent = 300 - timeLeft; // 소요 시간 계산
                    setTimeout(() => {
                        showResultModal(timeSpent);
                    }, 500);
                }
            }
        }
        
        firstCard.element.classList.remove('selected');
        selectedCards = [];
    }
}

function updateTimer() {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if(timeLeft <= 0) {
        clearInterval(timerInterval);
        alert('시간 초과! 게임 오버');
        initGame();
    }
}

function initGame() {
    const modal = document.getElementById('resultModal');
    modal.style.display = 'none';
    
    const boardElement = document.querySelector('.game-board');
    boardElement.innerHTML = '';
    selectedCards = [];
    matchedPairs = 0;
    timeLeft = 300;
    document.getElementById('matches').textContent = '0';
    document.getElementById('timer').textContent = timeLeft;
    
    createBoard();
    initCanvas();
    
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            const card = document.createElement('div');
            card.className = 'card';
            if(!gameBoard[i][j]) {
                card.classList.add('empty');
            } else {
                const img = document.createElement('img');
                img.src = `img/${gameBoard[i][j]}`;
                img.alt = 'card';
                card.appendChild(img);
            }
            card.dataset.row = i;
            card.dataset.col = j;
            card.addEventListener('click', () => handleCardClick(i, j));
            boardElement.appendChild(card);
        }
    }
    
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function shuffleArray(array) {
    const newArray = [...array];
    for(let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 매칭 가능한 쌍이 있는지 확인하는 함수
function hasValidMoves() {
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            if(!gameBoard[i][j]) continue;
            
            // 현재 카드와 같은 이미지를 가진 다른 카드를 찾습니다
            for(let x = 0; x < BOARD_SIZE; x++) {
                for(let y = 0; y < BOARD_SIZE; y++) {
                    if(i === x && j === y) continue;
                    if(!gameBoard[x][y]) continue;
                    
                    if(gameBoard[i][j] === gameBoard[x][y]) {
                        // 연결 가능한지 확인
                        if(canConnect({row: i, col: j}, {row: x, col: y})) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

// 보드에 있는 모든 카드의 짝이 맞는지 확인하는 함수
function validatePairs() {
    const cardCounts = {};
    
    // 모든 카드 개수 세기
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            const card = gameBoard[i][j];
            cardCounts[card] = (cardCounts[card] || 0) + 1;
        }
    }
    
    // 모든 카드가 짝수 개인지 확인
    const invalidPairs = Object.entries(cardCounts).filter(([_, count]) => count % 2 !== 0);
    if(invalidPairs.length > 0) {
        console.log('짝이 맞지 않는 카드 발견, 보드 재생성');
        createBoard(); // 짝이 맞지 않으면 보드 재생성
    }
}

// reshuffleRemainingCards 함수 수정
function reshuffleRemainingCards() {
    const remainingCards = [];
    const positions = [];
    
    // 남은 카드와 위치를 수집
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            if(gameBoard[i][j]) {
                remainingCards.push(gameBoard[i][j]);
                positions.push({row: i, col: j});
            }
        }
    }
    
    // 카드를 섞되, 짝이 맞도록 섞기
    const shuffledCards = [];
    while(remainingCards.length > 0) {
        const card = remainingCards.pop();
        const matchIndex = remainingCards.findIndex(c => c === card);
        
        if(matchIndex !== -1) {
            // 짝이 있는 경우
            const matchCard = remainingCards.splice(matchIndex, 1)[0];
            shuffledCards.push(card, matchCard);
        } else {
            // 짝이 없는 경우 (이런 경우가 없어야 함)
            shuffledCards.push(card);
        }
    }
    
    // 섞인 카드를 원래 위치에 재배치
    positions.forEach((pos, index) => {
        gameBoard[pos.row][pos.col] = shuffledCards[index];
    });
    
    // 보드 UI 업데이트
    updateBoardUI();
    
    // 짝이 맞는지 다시 확인
    validatePairs();
}

// 보드 UI를 업데이트하는 함수
function updateBoardUI() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const row = parseInt(card.dataset.row);
        const col = parseInt(card.dataset.col);
        
        if(gameBoard[row][col]) {
            card.innerHTML = '';
            const img = document.createElement('img');
            img.src = `img/${gameBoard[row][col]}`;
            img.alt = 'card';
            card.appendChild(img);
            card.classList.remove('empty');
        } else {
            card.innerHTML = '';
            card.classList.add('empty');
        }
    });
}

// 모달 관련 함수 추가
function showResultModal(timeSpent) {
    const modal = document.getElementById('resultModal');
    const finalTime = document.getElementById('finalTime');
    finalTime.textContent = timeSpent;
    modal.style.display = 'flex';
}

// 다시하기 버튼 이벤트 리스너 추가
document.getElementById('restartButton').addEventListener('click', () => {
    const modal = document.getElementById('resultModal');
    modal.style.display = 'none';
    initGame();
});

// 게임 화면의 다시하기 버튼 이벤트 리스너
document.getElementById('gameRestartButton').addEventListener('click', () => {
    if(confirm('정말 다시 시작하시겠습니까?')) {
        initGame();
    }
});

// 게임 시작
window.addEventListener('load', initGame); 