document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step, .replication-container, .report-header');
    const nav = document.querySelector('.global-nav');
    const menuDots = document.querySelectorAll('.menu-dot');
    const floatingMenu = document.querySelector('.floating-menu');

    const chartData = {}; // No JS charts for now

    const renderChart = (stepIndex) => {
        // No charts to render
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stepIndex = parseFloat(entry.target.dataset.step);

                // Hide Global Nav on scroll (Step 1+)
                if (stepIndex >= 1) {
                    nav.style.transform = 'translateY(-100%)';
                    nav.style.transition = 'transform 0.5s ease';
                } else {
                    nav.style.transform = 'translateY(0)';
                    nav.style.transition = 'transform 0.5s ease';
                }

                steps.forEach(s => s.classList.remove('active'));
                entry.target.classList.add('active');

                menuDots.forEach(dot => {
                    dot.classList.remove('active');
                    if (parseFloat(dot.dataset.step) === stepIndex) dot.classList.add('active');
                });

                // Animate Company Ranking on Step 1
                if (stepIndex === 1) {
                    const companyBars = document.querySelectorAll('.company-bar');
                    companyBars.forEach((bar, index) => {
                        const targetWidth = bar.dataset.width;

                        // 이미 애니메이션이 실행되었으면 바로 목표 너비로 설정
                        if (bar.dataset.animated === 'true') {
                            bar.style.width = targetWidth;
                            bar.classList.add('animate');
                            return;
                        }

                        // 처음 실행 시에만 애니메이션
                        bar.style.width = '0%';
                        setTimeout(() => {
                            bar.style.width = targetWidth;
                            bar.classList.add('animate');
                            bar.dataset.animated = 'true';
                        }, index * 10);
                    });
                }

                // Theme Logic
                if (stepIndex >= 1 && stepIndex <= 3) {
                    floatingMenu.classList.add('dark-theme');
                    // nav.classList.add('dark-theme'); // Disabled to keep logo white
                } else {
                    floatingMenu.classList.remove('dark-theme');
                    // nav.classList.remove('dark-theme'); // Disabled to keep logo white
                }

                // Animate Gender Chart on Step 3 (Gender Gap)
                if (stepIndex === 3) {
                    const genderBars = document.querySelectorAll('.g-bar');
                    genderBars.forEach((bar, index) => {
                        // Store original height if not already stored
                        if (!bar.dataset.height) {
                            bar.dataset.height = bar.style.height;
                            bar.style.height = '0';
                        }
                        // Trigger reflow
                        void bar.offsetWidth;
                        // Animate to original height with delay
                        setTimeout(() => {
                            bar.style.height = bar.dataset.height;
                        }, index * 100); // Staggered effect
                    });
                } else {
                    // Reset bars when leaving Step 2
                    const genderBars = document.querySelectorAll('.g-bar');
                    genderBars.forEach(bar => {
                        if (bar.dataset.height) {
                            bar.style.height = '0';
                        }
                    });
                }

                if (chartData[stepIndex]) renderChart(stepIndex);

                // 분포 그래프 애니메이션 트리거
                if (entry.target.id === 'step-2') {
                    // 이미 애니메이션이 실행되었다면 중단
                    if (entry.target.dataset.animated === 'true') return;

                    const animRect = document.getElementById('anim-rect');
                    const animText = document.getElementById('anim-text');
                    const animSlide = document.getElementById('anim-slide');

                    if (animRect && animText) {
                        animRect.beginElement();
                        animText.beginElement();
                    }

                    if (animSlide) {
                        animSlide.beginElement();
                        // 실행 플래그 설정
                        entry.target.dataset.animated = 'true';

                        // 1. 슬라이드(1.0초)가 끝난 후 라인 상승 시작
                        setTimeout(() => {
                            const animLineGrowth = document.getElementById('anim-line-growth');
                            if (animLineGrowth) animLineGrowth.beginElement();

                            // 2. 라인 상승(0.3초)이 끝난 후 페이드인 시작
                            setTimeout(() => {
                                const animFade = document.getElementById('anim-fade');
                                if (animFade) animFade.beginElement();
                            }, 300);
                        }, 1000);
                    }
                }
            }
        });
    }, { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 });

    steps.forEach(step => observer.observe(step));

    // Sidebar
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuBtn && sidebar && overlay && closeBtn) {
        const toggleSidebar = (show) => {
            if (show) {
                sidebar.classList.add('active');
                overlay.classList.add('active');
            } else {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        };

        menuBtn.addEventListener('click', () => toggleSidebar(true));
        closeBtn.addEventListener('click', () => toggleSidebar(false));
        overlay.addEventListener('click', () => toggleSidebar(false));
    }

    // Email Gate
    const emailGateOverlay = document.getElementById('email-gate-overlay');
    const emailGateForm = document.getElementById('email-gate-form');
    const gateMessage = document.getElementById('gate-message');

    // Gate at Step 3 (Gender Gap - Last Step)
    const stepLast = document.getElementById('step-3');

    const hasSubmitted = localStorage.getItem('emailGateSubmitted');

    // 닫기(X) 버튼: 게이트를 닫고 이번 방문 동안 다시 띄우지 않음 (마지막 섹션 블러는 유지)
    let gateDismissed = false;
    const gateCloseBtn = document.getElementById('gate-close');
    if (gateCloseBtn) {
        gateCloseBtn.addEventListener('click', () => {
            emailGateOverlay.classList.remove('active');
            gateDismissed = true;
        });
    }

    // 마지막 섹션(step-3)이 화면에 절반 이상 보이면 게이트 표시.
    // 스크롤 이벤트 기반으로 판정: 로딩 직후 임시 레이아웃으로 인한 오작동이 없고 iframe 안에서도 안정적으로 동작.
    if (stepLast && !hasSubmitted) {
        const checkGate = () => {
            if (gateDismissed) return; // 사용자가 닫았으면 다시 띄우지 않음
            if (window.scrollY < 200) return; // 실제로 스크롤을 내린 경우에만
            const r = stepLast.getBoundingClientRect();
            const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
            const needed = Math.min(r.height, window.innerHeight) * 0.5;
            if (visible >= needed) {
                emailGateOverlay.classList.add('active');
                // Lock content from the last step onwards
                document.querySelectorAll('#step-3').forEach(el => {
                    el.classList.add('content-locked');
                });
                window.removeEventListener('scroll', checkGate);
            }
        };
        window.addEventListener('scroll', checkGate, { passive: true });
    }

    if (emailGateForm) {
        emailGateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const company = document.getElementById('gate-company').value.trim();
            const name = document.getElementById('gate-name').value.trim();
            const position = document.getElementById('gate-position').value.trim();
            const email = document.getElementById('gate-email').value.trim();

            if (!company || !name || !position || !email) {
                gateMessage.textContent = '모든 항목을 입력해주세요.';
                gateMessage.className = 'gate-message error';
                return;
            }

            // 퍼블릭 이메일 도메인 차단
            const publicDomains = ['gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'yahoo.com', 'outlook.com', 'hotmail.com'];
            const emailDomain = email.split('@')[1]?.toLowerCase();

            if (publicDomains.includes(emailDomain)) {
                gateMessage.textContent = '회사 이메일 주소를 입력해주세요.';
                gateMessage.className = 'gate-message error';
                return;
            }

            // 구글 시트로 데이터 전송
            const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwi1JyQGw1Dr4y1E7SwfnCUeGWC2Y4l9Ccp9HZYkM5ypE3ktuM_SIrKP-04ExvVC4tw/exec';

            gateMessage.textContent = '제출 중...';
            gateMessage.className = 'gate-message';

            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    company: company,
                    name: name,
                    position: position,
                    email: email
                })
            }).then(() => {
                gateMessage.textContent = '감사합니다! 계속 읽어보세요.';
                gateMessage.className = 'gate-message success';
                localStorage.setItem('emailGateSubmitted', 'true');
                setTimeout(() => {
                    emailGateOverlay.classList.remove('active');
                    document.querySelectorAll('.content-locked').forEach(el => {
                        el.classList.remove('content-locked');
                    });
                }, 1500);
            }).catch(error => {
                console.error('Error:', error);
                // 에러가 나도 성공으로 처리 (no-cors 모드에서는 응답을 읽을 수 없음)
                gateMessage.textContent = '감사합니다! 계속 읽어보세요.';
                gateMessage.className = 'gate-message success';
                localStorage.setItem('emailGateSubmitted', 'true');
                setTimeout(() => {
                    emailGateOverlay.classList.remove('active');
                    document.querySelectorAll('.content-locked').forEach(el => {
                        el.classList.remove('content-locked');
                    });
                }, 1500);
            });
        });
    }
});

// 툴팁을 마우스 위치에 따라 표시
document.querySelectorAll('.company-bar[data-tooltip]').forEach(bar => {
    bar.addEventListener('mousemove', (e) => {
        const rect = bar.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const barWidth = rect.width;
        const percentage = (mouseX / barWidth) * 100;

        bar.style.setProperty('--tooltip-position', `${percentage}%`);
    });
});
