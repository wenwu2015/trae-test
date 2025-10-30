// 获取Canvas元素和上下文
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// 设置Canvas尺寸
function resizeCanvas() {
    const container = canvas.parentElement;
    const width = container.clientWidth - 40; // 减去padding
    const height = Math.min(500, window.innerHeight * 0.6);
    canvas.width = width;
    canvas.height = height;
}

// 初始化调整Canvas尺寸
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 物理常量
const GRAVITY = 0.2; // 重力加速度
const RESTITUTION = 0.8; // 弹性系数
const FRICTION = 0.99; // 摩擦系数

// 弹球类
class Ball {
    constructor(x, y, radius, dx, dy) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = dx;
        this.dy = dy;
        this.mass = radius * radius; // 质量与半径平方成正比
        // 随机颜色
        this.color = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`;
    }

    // 绘制弹球
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        
        // 添加高光效果
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.closePath();
    }

    // 更新弹球位置
    update() {
        // 应用重力
        this.dy += GRAVITY;
        
        // 更新位置
        this.x += this.dx;
        this.y += this.dy;
        
        // 圆柱体边界碰撞检测 (左右边界)
        const cylinderRadius = canvas.width * 0.4; // 圆柱体半径
        const centerX = canvas.width / 2;
        
        // 计算到中心的距离
        const distanceToCenter = Math.sqrt((this.x - centerX) ** 2);
        
        // 如果碰到左右边界
        if (distanceToCenter + this.radius > cylinderRadius) {
            // 计算法线向量
            const normalX = (this.x - centerX) / distanceToCenter;
            
            // 计算入射速度在法线方向的分量
            const dotProduct = this.dx * normalX;
            
            // 应用弹性碰撞
            this.dx -= (1 + RESTITUTION) * dotProduct * normalX;
            this.dx *= FRICTION;
            
            // 调整位置，防止穿透
            const correctionDistance = (distanceToCenter + this.radius) - cylinderRadius;
            this.x -= correctionDistance * normalX;
        }
        
        // 上下边界碰撞
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.dy = -this.dy * RESTITUTION;
            this.dy *= FRICTION;
        }
        
        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.dy = -this.dy * RESTITUTION;
            this.dx *= FRICTION;
        }
        
        this.draw();
    }

    // 检查与其他弹球的碰撞
    checkCollision(otherBall) {
        const dx = otherBall.x - this.x;
        const dy = otherBall.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.radius + otherBall.radius;
        
        if (distance < minDistance) {
            // 计算碰撞后的速度
            const nx = dx / distance;
            const ny = dy / distance;
            const tx = -ny;
            const ty = nx;
            
            // 计算切线方向的速度分量
            const v1t = this.dx * tx + this.dy * ty;
            const v2t = otherBall.dx * tx + otherBall.dy * ty;
            
            // 计算法向方向的速度分量
            const v1n = this.dx * nx + this.dy * ny;
            const v2n = otherBall.dx * nx + otherBall.dy * ny;
            
            // 计算碰撞后的法向速度分量
            const v1nAfter = (v1n * (this.mass - otherBall.mass) + 2 * otherBall.mass * v2n) / (this.mass + otherBall.mass);
            const v2nAfter = (v2n * (otherBall.mass - this.mass) + 2 * this.mass * v1n) / (this.mass + otherBall.mass);
            
            // 更新速度
            this.dx = v1t * tx + v1nAfter * nx;
            this.dy = v1t * ty + v1nAfter * ny;
            otherBall.dx = v2t * tx + v2nAfter * nx;
            otherBall.dy = v2t * ty + v2nAfter * ny;
            
            // 应用弹性
            this.dx *= RESTITUTION;
            this.dy *= RESTITUTION;
            otherBall.dx *= RESTITUTION;
            otherBall.dy *= RESTITUTION;
            
            // 分离重叠的球
            const overlap = (minDistance - distance) / 2;
            this.x -= overlap * nx;
            this.y -= overlap * ny;
            otherBall.x += overlap * nx;
            otherBall.y += overlap * ny;
        }
    }
}

// 弹球数组
let balls = [];
const initialBallCount = 25;
let simulationSpeed = 5;
let isRunning = false;
let animationId = null;

// 创建弹球
function createBalls(count) {
    balls = [];
    const cylinderRadius = canvas.width * 0.4;
    const centerX = canvas.width / 2;
    const minRadius = 8;
    const maxRadius = 15;
    
    for (let i = 0; i < count; i++) {
        let radius = Math.random() * (maxRadius - minRadius) + minRadius;
        
        // 确保球不会初始就重叠
        let x, y;
        let validPosition = false;
        
        // 尝试多次找到有效的位置
        for (let attempt = 0; attempt < 50; attempt++) {
            // 在圆柱体内随机位置
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (cylinderRadius - radius);
            x = centerX + distance * Math.cos(angle);
            y = Math.random() * (canvas.height - 2 * radius) + radius;
            
            // 检查是否与已有球重叠
            let overlaps = false;
            for (const ball of balls) {
                const dx = ball.x - x;
                const dy = ball.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ball.radius + radius) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps) {
                validPosition = true;
                break;
            }
        }
        
        // 如果找不到有效位置，使用默认位置
        if (!validPosition) {
            x = centerX + Math.random() * 100 - 50;
            y = Math.random() * canvas.height * 0.5;
        }
        
        // 初始速度
        const dx = (Math.random() - 0.5) * 4;
        const dy = (Math.random() - 0.5) * 4;
        
        balls.push(new Ball(x, y, radius, dx, dy));
    }
}

// 绘制圆柱体
function drawCylinder() {
    const cylinderRadius = canvas.width * 0.4;
    const centerX = canvas.width / 2;
    
    // 绘制圆柱体背景
    ctx.beginPath();
    ctx.moveTo(centerX - cylinderRadius, 0);
    ctx.lineTo(centerX + cylinderRadius, 0);
    ctx.quadraticCurveTo(centerX + cylinderRadius, canvas.height * 0.5, centerX + cylinderRadius, canvas.height);
    ctx.lineTo(centerX - cylinderRadius, canvas.height);
    ctx.quadraticCurveTo(centerX - cylinderRadius, canvas.height * 0.5, centerX - cylinderRadius, 0);
    ctx.fillStyle = 'rgba(240, 240, 255, 0.7)';
    ctx.fill();
    ctx.closePath();
    
    // 绘制圆柱体边框
    ctx.beginPath();
    ctx.moveTo(centerX - cylinderRadius, 0);
    ctx.lineTo(centerX + cylinderRadius, 0);
    ctx.lineTo(centerX + cylinderRadius, canvas.height);
    ctx.lineTo(centerX - cylinderRadius, canvas.height);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(200, 200, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 动画循环
function animate() {
    if (!isRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制圆柱体
    drawCylinder();
    
    // 更新和绘制所有弹球
    for (let i = 0; i < balls.length; i++) {
        balls[i].update();
        
        // 检测与其他球的碰撞
        for (let j = i + 1; j < balls.length; j++) {
            balls[i].checkCollision(balls[j]);
        }
    }
    
    // 根据速度调整动画帧
    animationId = requestAnimationFrame(animate);
}

// 控制按钮事件监听
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const ballCountSlider = document.getElementById('ballCount');
const countValue = document.getElementById('countValue');
const speedSlider = document.getElementById('speed');

startBtn.addEventListener('click', () => {
    if (!isRunning) {
        isRunning = true;
        animate();
    }
});

pauseBtn.addEventListener('click', () => {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

resetBtn.addEventListener('click', () => {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    const count = parseInt(ballCountSlider.value);
    createBalls(count);
    // 绘制初始状态
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCylinder();
    balls.forEach(ball => ball.draw());
});

ballCountSlider.addEventListener('input', () => {
    const count = parseInt(ballCountSlider.value);
    countValue.textContent = count;
    
    // 重置时应用新的球数量
    if (!isRunning) {
        createBalls(count);
        // 绘制初始状态
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCylinder();
        balls.forEach(ball => ball.draw());
    }
});

speedSlider.addEventListener('input', () => {
    simulationSpeed = parseInt(speedSlider.value);
    // 调整速度可以通过修改物理参数实现
    // 这里简化处理
});

// 初始化
function init() {
    createBalls(initialBallCount);
    countValue.textContent = initialBallCount;
    // 绘制初始状态
    drawCylinder();
    balls.forEach(ball => ball.draw());
}

// 启动应用
init();