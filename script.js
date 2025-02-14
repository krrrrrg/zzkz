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

// 난이도 관련 변수 수정
const TIME_LIMIT = 120; // 2분
let shuffleInterval; // 재배치 인터벌 변수 추가

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
                    endGame();
                    const timeSpent = TIME_LIMIT - timeLeft;
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
        endGame();
        alert('시간 초과! 게임 오버');
        initGame();
    }
}

function initGame() {
    clearInterval(shuffleInterval); // 이전 인터벌 제거
    
    const modal = document.getElementById('resultModal');
    modal.style.display = 'none';
    
    const boardElement = document.querySelector('.game-board');
    boardElement.innerHTML = '';
    selectedCards = [];
    matchedPairs = 0;
    timeLeft = TIME_LIMIT;
    
    document.getElementById('matches').textContent = '0';
    document.getElementById('timer').textContent = timeLeft;
    
    createBoard();
    initCanvas();
    
    // 보드 UI 생성
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
    
    // 10초마다 카드 재배치
    shuffleInterval = setInterval(() => {
        const remainingCards = getRemainingCards();
        if(remainingCards.length > 4) {
            // 화면 깜빡임 효과
            const boardElement = document.querySelector('.game-board');
            boardElement.style.opacity = '0.3';
            
            setTimeout(() => {
                reshuffleRemainingCards();
                boardElement.style.opacity = '1';
            }, 300);
        }
    }, 10000); // 10초로 변경
    
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
    
    // 남은 카드 수집
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            if(gameBoard[i][j]) {
                remainingCards.push({
                    card: gameBoard[i][j],
                    oldPos: {row: i, col: j}
                });
                gameBoard[i][j] = null;
            }
        }
    }

    // 카드 쌍을 찾아서 저장
    const cardPairs = [];
    while(remainingCards.length > 0) {
        const card = remainingCards.pop();
        const matchIndex = remainingCards.findIndex(c => c.card === card.card);
        if(matchIndex !== -1) {
            const matchCard = remainingCards.splice(matchIndex, 1)[0];
            cardPairs.push([card, matchCard]);
        }
    }

    // 보드의 모든 빈 위치 수집
    const emptyPositions = [];
    for(let i = 0; i < BOARD_SIZE; i++) {
        for(let j = 0; j < BOARD_SIZE; j++) {
            if(!gameBoard[i][j]) {
                emptyPositions.push({row: i, col: j});
            }
        }
    }

    // 카드 쌍을 극한의 어려움으로 배치
    cardPairs.forEach(pair => {
        // 첫 번째 카드는 코너나 가장자리에 우선 배치
        const cornerPositions = emptyPositions.filter(pos => 
            (pos.row === 0 || pos.row === BOARD_SIZE-1) &&
            (pos.col === 0 || pos.col === BOARD_SIZE-1)
        );
        
        const edgePositions = emptyPositions.filter(pos => 
            pos.row === 0 || pos.row === BOARD_SIZE-1 ||
            pos.col === 0 || pos.col === BOARD_SIZE-1
        );

        let pos1;
        if(cornerPositions.length > 0 && Math.random() < 0.7) {
            // 70% 확률로 코너에 배치
            const cornerIndex = Math.floor(Math.random() * cornerPositions.length);
            pos1 = cornerPositions[cornerIndex];
        } else if(edgePositions.length > 0 && Math.random() < 0.8) {
            // 80% 확률로 가장자리에 배치
            const edgeIndex = Math.floor(Math.random() * edgePositions.length);
            pos1 = edgePositions[edgeIndex];
        } else {
            // 나머지는 랜덤 위치
            const randomIndex = Math.floor(Math.random() * emptyPositions.length);
            pos1 = emptyPositions[randomIndex];
        }

        // 첫 번째 카드 위치 제거
        emptyPositions.splice(emptyPositions.findIndex(p => 
            p.row === pos1.row && p.col === pos1.col), 1);

        // 두 번째 카드 위치 선택을 위한 전략
        let bestPos2Index = 0;
        let maxDifficulty = 0;

        emptyPositions.forEach((pos, index) => {
            let difficulty = 0;
            
            // 1. 거리 점수 (멀수록 어려움)
            const distance = Math.abs(pos.row - pos1.row) + Math.abs(pos.col - pos1.col);
            difficulty += distance * 4;

            // 2. 장애물 밀집도 점수
            let obstacles = 0;
            for(let i = -1; i <= 1; i++) {
                for(let j = -1; j <= 1; j++) {
                    const checkRow = pos.row + i;
                    const checkCol = pos.col + j;
                    if(checkRow >= 0 && checkRow < BOARD_SIZE && 
                       checkCol >= 0 && checkCol < BOARD_SIZE && 
                       gameBoard[checkRow][checkCol]) {
                        obstacles++;
                    }
                }
            }
            difficulty += obstacles * 20;

            // 3. 코너/가장자리 보너스
            if(pos.row === 0 || pos.row === BOARD_SIZE-1 || 
               pos.col === 0 || pos.col === BOARD_SIZE-1) {
                difficulty += 40;
                if((pos.row === 0 || pos.row === BOARD_SIZE-1) && 
                   (pos.col === 0 || pos.col === BOARD_SIZE-1)) {
                    difficulty += 60;
                }
            }

            // 4. 직선 연결 방지 (매우 강력한 페널티)
            if(pos.row === pos1.row || pos.col === pos1.col) {
                difficulty -= 100;
            }

            // 5. 대각선 연결 방지
            if(Math.abs(pos.row - pos1.row) === Math.abs(pos.col - pos1.col)) {
                difficulty -= 50;
            }

            // 6. 중앙 지역 회피 점수
            const centerDistance = Math.min(
                Math.abs(pos.row - BOARD_SIZE/2),
                Math.abs(pos.col - BOARD_SIZE/2)
            );
            difficulty += centerDistance * 15;

            if(difficulty > maxDifficulty) {
                maxDifficulty = difficulty;
                bestPos2Index = index;
            }
        });

        const pos2 = emptyPositions.splice(bestPos2Index, 1)[0];

        // 카드 배치
        gameBoard[pos1.row][pos1.col] = pair[0].card;
        gameBoard[pos2.row][pos2.col] = pair[1].card;
    });

    // 보드 UI 업데이트
    updateBoardUI();

    // 매칭 가능한 카드가 있는지 확인
    if(!hasValidMoves()) {
        reshuffleRemainingCards();
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

// 게임 종료 시 인터벌 정리
function endGame() {
    clearInterval(timerInterval);
    clearInterval(shuffleInterval);
}

// 게임 시작
window.addEventListener('load', initGame); 