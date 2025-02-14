const baseImages = [
    'apple.png', 'btc.png', 'doge.jpeg', 'eth.png', 'google.png',
    'hwang.jpeg', 'meta.png', 'metaceo.jpeg', 'musk1.jpeg', 'musk2.jpeg',
    'nvidia.png', 'pepe.png', 'pltr.png', 'salor.jpeg', 'sam.jpeg',
    'sat.png', 'shib.jpeg', 'soft.png', 'sol.jpeg', 'truck.jpeg',
    'trump.jpeg', 'trump2.jpeg', 'tsla.png', 'x.png', 'xrp.png'
];

let gameBoard = [];
let selectedCards = [];
let matchedPairs = 0;
let timeLeft = 120; // 2분
let timerInterval;
let shuffleInterval;

// 보드 크기를 10x10으로 설정
const BOARD_SIZE = 10;
const TIME_LIMIT = 120;

// DOMContentLoaded 이벤트에서 초기화
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

function createPairs() {
    const pairs = [];
    
    // 모든 이미지를 정확히 2쌍씩 생성 (25개 × 4장 = 100장)
    baseImages.forEach(image => {
        // 각 이미지당 4장씩 추가 (2쌍)
        for(let i = 0; i < 4; i++) {
            pairs.push(image);
        }
    });
    
    // 디버깅을 위한 로그
    console.log('총 카드 수:', pairs.length);
    const cardCounts = {};
    pairs.forEach(card => {
        cardCounts[card] = (cardCounts[card] || 0) + 1;
    });
    console.log('카드별 개수:', cardCounts);
    
    return shuffleArray(pairs);
}

function createBoard() {
    const pairs = createPairs();
    gameBoard = [];
    
    for(let i = 0; i < BOARD_SIZE; i++) {
        gameBoard[i] = [];
        for(let j = 0; j < BOARD_SIZE; j++) {
            const cardIndex = i * BOARD_SIZE + j;
            if (cardIndex < pairs.length) {
                gameBoard[i][j] = pairs[cardIndex];
            } else {
                gameBoard[i][j] = null;
            }
        }
    }
}

function canConnect(start, end) {
    // 직선 경로 확인
    function checkStraightLine(start, end) {
        if (start.row === end.row) {
            // 가로 방향 확인
            const minCol = Math.min(start.col, end.col);
            const maxCol = Math.max(start.col, end.col);
            for (let col = minCol + 1; col < maxCol; col++) {
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
        const corner1 = { 
            row: end.row, 
            col: start.col,
            isOutside: end.row < 0 || end.row >= BOARD_SIZE || start.col < 0 || start.col >= BOARD_SIZE
        };

        const corner2 = { 
            row: start.row, 
            col: end.col,
            isOutside: start.row < 0 || start.row >= BOARD_SIZE || end.col < 0 || end.col >= BOARD_SIZE
        };

        if ((corner1.isOutside || !gameBoard[corner1.row]?.[corner1.col]) && 
            checkStraightLine(start, corner1) && 
            checkStraightLine(corner1, end)) {
            return true;
        }

        if ((corner2.isOutside || !gameBoard[corner2.row]?.[corner2.col]) && 
            checkStraightLine(start, corner2) && 
            checkStraightLine(corner2, end)) {
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
                // 즉시 투명도 적용
                firstCard.element.style.opacity = '0';
                clickedCard.style.opacity = '0';
                
                // 약간의 지연 후 실제 제거
                setTimeout(() => {
                    gameBoard[firstCard.row][firstCard.col] = null;
                    gameBoard[row][col] = null;
                    firstCard.element.classList.add('empty');
                    clickedCard.classList.add('empty');
                    matchedPairs++;
                    document.getElementById('matches').textContent = matchedPairs;
                    
                    if(!hasValidMoves()) {
                        reshuffleRemainingCards();
                    }
                    
                    if(matchedPairs === 50) {
                        endGame();
                        const timeSpent = TIME_LIMIT - timeLeft;
                        showGameClear(timeSpent);
                    }
                }, 150); // 애니메이션 시간과 맞춤
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
        endGame();
        showGameOver();
    }
}

// 남은 카드 가져오는 함수 추가
function getRemainingCards() {
    const remainingCards = [];
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            if(gameBoard[i][j]) {
                remainingCards.push(gameBoard[i][j]);
            }
        }
    }
    return remainingCards;
}

// initGame 함수 수정
function initGame() {
    clearInterval(shuffleInterval);
    clearInterval(timerInterval);
    
    const boardElement = document.querySelector('.game-board');
    if(!boardElement) return; // 보드 엘리먼트가 없으면 리턴
    
    boardElement.innerHTML = '';
    selectedCards = [];
    matchedPairs = 0;
    timeLeft = TIME_LIMIT;
    
    document.getElementById('matches').textContent = '0';
    document.getElementById('timer').textContent = timeLeft;
    
    createBoard();
    renderBoard();
    
    // 10초마다 카드 재배치
    shuffleInterval = setInterval(() => {
        const remainingCards = getRemainingCards();
        // 남은 카드가 2장 초과일 때만 재배치 (마지막 한 쌍은 재배치하지 않음)
        if(remainingCards.length > 2) {
            const boardElement = document.querySelector('.game-board');
            boardElement.style.opacity = '0.3';
            setTimeout(() => {
                reshuffleRemainingCards();
                boardElement.style.opacity = '1';
            }, 150);
        }
    }, 10000);
    
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

// validatePairs 함수 수정
function validatePairs() {
    let maxAttempts = 5;
    
    while(maxAttempts > 0) {
        // 모든 카드 개수 세기
        const counts = {};
        for(let i = 0; i < BOARD_SIZE; i++) {
            for(let j = 0; j < BOARD_SIZE; j++) {
                const card = gameBoard[i][j];
                if(card) {
                    counts[card] = (counts[card] || 0) + 1;
                }
            }
        }
        
        // 모든 카드가 짝수 개인지 확인
        const invalidPairs = Object.entries(counts).filter(([_, count]) => count % 2 !== 0);
        
        // 짝이 모두 맞으면 종료
        if(invalidPairs.length === 0) {
            return true;
        }
        
        // 짝이 맞지 않으면 보드 재생성
        maxAttempts--;
        const pairs = createPairs();
        const shuffled = shuffleArray(pairs);
        
        // 보드에 새로운 카드 배치
        let cardIndex = 0;
        for(let i = 0; i < BOARD_SIZE; i++) {
            for(let j = 0; j < BOARD_SIZE; j++) {
                gameBoard[i][j] = shuffled[cardIndex++];
            }
        }
    }
    
    // 최대 시도 횟수를 초과하면 게임 재시작
    console.error('짝 맞추기 실패, 기본 상태로 초기화');
    initGame();
    return false;
}

// reshuffleRemainingCards 함수 수정
function reshuffleRemainingCards() {
    // 1. 현재 남아있는 카드들만 수집
    const remainingCards = [];
    const positions = [];
    
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            if(gameBoard[i][j]) {
                remainingCards.push(gameBoard[i][j]);
                positions.push({row: i, col: j});
            }
        }
    }
    
    // 2. 남은 카드들만 섞기
    const shuffledCards = shuffleArray([...remainingCards]);
    
    // 3. 현재 보드 상태 저장
    const tempBoard = Array(BOARD_SIZE).fill(null)
        .map(() => Array(BOARD_SIZE).fill(null));
    
    // 4. 섞인 카드들을 빈 자리에 배치
    shuffledCards.forEach((card, index) => {
        const pos = positions[index];
        tempBoard[pos.row][pos.col] = card;
    });
    
    // 5. 새로운 보드 상태 적용
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            gameBoard[i][j] = tempBoard[i][j];
        }
    }
    
    // 6. UI 업데이트
    updateBoardUI();
    
    // 7. 매칭 가능한 카드가 있는지 확인
    if(!hasValidMoves()) {
        setTimeout(() => {
            reshuffleRemainingCards();
        }, 100);
    }
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

function showGameClear(timeSpent) {
    const boardElement = document.querySelector('.game-board');
    boardElement.innerHTML = `
        <div class="clear-message success">
            <h2>🎉 클리어! 🎉</h2>
            <p>님 좀 치네여</p>
            <p>클리어 시간: ${timeSpent}초!</p>
            <button class="restart-button" onclick="initGame()">다시하기</button>
        </div>
    `;
}

// 게임 종료 시 인터벌 정리
function endGame() {
    clearInterval(timerInterval);
    clearInterval(shuffleInterval);
}

// 중복된 renderBoard 함수 제거하고 하나로 통합
function renderBoard() {
    const boardElement = document.querySelector('.game-board');
    boardElement.innerHTML = '';
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;
    
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
}

// 게임 화면의 다시하기 버튼 이벤트 리스너 추가
document.getElementById('gameRestartButton').addEventListener('click', () => {
    if(confirm('정말 다시 시작하시겠습니까?')) {
        initGame();
    }
});

// 게임 오버 메시지를 보여주는 함수 추가
function showGameOver() {
    const boardElement = document.querySelector('.game-board');
    boardElement.innerHTML = `
        <div class="clear-message fail">
            <h2>ㅋㅋㅋㅋㅋ</h2>
            <p>항상 겸손해라</p>
            <p>시간 초과...</p>
            <button class="restart-button" onclick="initGame()">다시하기</button>
        </div>
    `;
} 