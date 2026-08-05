var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fzalJHTQwne4QqxHYCE9j3zyz-kcHYLQmKqEFOgao-X8kMmSfMn9UBwNBochLTVl/exec';

// 광고/공유 유입 추적: 현재 URL의 utm_* 파라미터와 리퍼러를 수집
function getAttribution() {
    const p = new URLSearchParams(window.location.search);
    const g = k => (p.get(k) || '').slice(0, 200);
    let referrer = '';
    try { const r = new URL(document.referrer); referrer = r.origin + r.pathname; } catch (e) {}
    return {
        utm_source: g('utm_source'), utm_medium: g('utm_medium'), utm_campaign: g('utm_campaign'),
        utm_content: g('utm_content'), utm_term: g('utm_term'), referrer: referrer
    };
}

// 방문 로그 전송 (메인 사이트의 logVisit과 같은 형식으로 "방문 로그" 탭에 쌓인다)
function logVisit(event) {
    try {
        const att = getAttribution();
        const payload = new URLSearchParams(Object.assign({
            action: 'visit_log',
            event: event,
            company: '',
            clientAt: new Date().toISOString(),
            page: window.location.href,
            userAgent: navigator.userAgent.slice(0, 500),
            language: navigator.language || '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            viewport: window.innerWidth + 'x' + window.innerHeight
        }, att));
        if (navigator.sendBeacon) { navigator.sendBeacon(GOOGLE_SCRIPT_URL, payload); return; }
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors', keepalive: true,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString()
        }).catch(() => {});
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    // 리포트 페이지 진입 1회 기록
    logVisit('report_view');

    // 테스트용: ?gate=reset 붙여 접속하면 제출 기록을 지우고 처음 상태(팝업·신청 폼)로 되돌린다
    try {
        if (new URLSearchParams(window.location.search).get('gate') === 'reset') {
            localStorage.removeItem('emailGateSubmitted');
        }
    } catch (e) {}

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

                steps.forEach(s => s.classList.remove('active'));
                entry.target.classList.add('active');

                // 파트 단위 네비게이터: 현재 스텝 이하 중 가장 가까운 도트를 활성화
                let activeDot = null;
                menuDots.forEach(dot => {
                    dot.classList.remove('active');
                    if (parseFloat(dot.dataset.step) <= stepIndex) activeDot = dot;
                });
                if (activeDot) activeDot.classList.add('active');

                // Animate Company Ranking (올해의 우수 기업)
                if (stepIndex === 3) {
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
                if (stepIndex >= 1 && stepIndex <= 9) {
                    floatingMenu.classList.add('dark-theme');
                    nav.classList.add('dark-theme');
                } else {
                    floatingMenu.classList.remove('dark-theme');
                    nav.classList.remove('dark-theme');
                }

                // Animate Gender Chart (Gender Gap)
                if (stepIndex === 9) {
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
                if (entry.target.id === 'step-7') {
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

    // 모바일 상단 햄버거 메뉴 (하단 탭바 대체)
    const mMenuBtn = document.getElementById('m-menu-btn');
    const mMenu = document.getElementById('m-menu');
    const mMenuOverlay = document.getElementById('m-menu-overlay');
    if (mMenuBtn && mMenu && mMenuOverlay) {
        const navEl = document.querySelector('.global-nav');
        const setMenu = (open) => {
            if (open) {
                // 패널을 항상 현재 내비 바로 아래에 붙인다
                const navBottom = Math.max(0, Math.round(navEl.getBoundingClientRect().bottom));
                mMenu.style.top = navBottom + 'px';
                mMenuOverlay.style.top = navBottom + 'px';
            }
            mMenu.classList.toggle('active', open);
            mMenuOverlay.classList.toggle('active', open);
            mMenuBtn.classList.toggle('open', open);
        };
        mMenuBtn.addEventListener('click', () => setMenu(!mMenu.classList.contains('active')));
        mMenuOverlay.addEventListener('click', () => setMenu(false));
        mMenu.querySelectorAll('.m-menu-link').forEach(link => link.addEventListener('click', () => setMenu(false)));
        window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });
    }

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
        sidebar.querySelectorAll('.sidebar-link, .blind-logo').forEach(link => {
            link.addEventListener('click', () => toggleSidebar(false));
        });
    }

    // Email Gate
    const emailGateOverlay = document.getElementById('email-gate-overlay');
    const emailGateForm = document.getElementById('email-gate-form');
    const gateMessage = document.getElementById('gate-message');
    const emailGateClose = document.getElementById('email-gate-close');

    // 닫기(X·바깥 클릭·ESC)는 팝업만 숨기고 마지막 섹션 블러는 유지한다.
    // 블러 해제는 폼 제출 성공 시에만 일어난다.
    let gateDismissed = false;
    const closeEmailGate = () => {
        emailGateOverlay.classList.remove('active');
        gateDismissed = true;
    };
    // 이메일 수집 팝업 표시. 성별 장표는 블러가 새겨진 이미지라
    // 팝업/제출과 무관하게 항상 잠겨 있고, 해제 로직 자체가 없다.
    // 팝업 노출은 방문당 1회만 기록한다(스크롤로 여러 번 떠도 중복 집계 방지)
    let gateViewLogged = false;
    const openGate = () => {
        if (localStorage.getItem('emailGateSubmitted')) return;
        emailGateOverlay.classList.add('active');
        if (!gateViewLogged) { gateViewLogged = true; logVisit('report_gate_view'); }
    };
    // 블러 이미지 위 CTA: 제출 전엔 팝업을 열고, 제출 후엔 완료 상태로 바꾼다
    const lockedCta = document.getElementById('locked-cta');
    // 신청 완료 후 카드: 완료 안내로 바뀌고, 버튼으로 신청 팝업을 다시 열 수 있다
    const markGateDone = () => {
        if (!lockedCta) return;
        const lockedTitle = document.getElementById('locked-title');
        const lockedDesc = document.getElementById('locked-desc');
        if (lockedTitle) { lockedTitle.textContent = '신청이 정상적으로 완료되었습니다.'; lockedTitle.style.margin = '0 0 6px'; }
        if (lockedDesc) {
            lockedDesc.style.display = '';
            lockedDesc.style.color = '#a0a0a6';
            lockedDesc.innerHTML = '메일함에서 리포트를 확인해보세요.<br>메일이 도착하지 않았다면<br>스팸함을 확인해주세요.';
        }
        lockedCta.textContent = '리포트 다시 신청하기';
        lockedCta.disabled = false;
        lockedCta.style.opacity = '1';
        lockedCta.style.cursor = 'pointer';
    };
    if (lockedCta) {
        if (localStorage.getItem('emailGateSubmitted')) markGateDone();
        lockedCta.addEventListener('click', () => {
            gateDismissed = false; // 닫았던 사용자도 버튼으로는 다시 열 수 있게
            // 재신청으로 여는 경우 이전 성공 메시지를 지워 새로 제출할 수 있게 한다
            if (gateMessage) { gateMessage.textContent = ''; gateMessage.className = 'gate-message'; }
            emailGateOverlay.classList.add('active');
        });
    }

    // 우하단 플로팅: 링크 공유
    const fabShare = document.getElementById('fab-share');
    const fabToast = document.getElementById('fab-toast');
    if (fabShare && fabToast) {
        fabShare.addEventListener('click', () => {
            const shareUrl = new URL(window.location.origin + window.location.pathname);
            shareUrl.searchParams.set('utm_source', 'share');
            shareUrl.searchParams.set('utm_medium', 'copy_link');
            shareUrl.searchParams.set('utm_campaign', 'annual_report');
            shareUrl.searchParams.set('sid', Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
            const shareText = `Blind Index | Annual Report\n블라인드 지수 올해 결과를 확인해보세요!\n${shareUrl.toString()}`;
            const done = () => {
                fabToast.classList.add('show');
                setTimeout(() => fabToast.classList.remove('show'), 1800);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareText).then(done).catch(done);
            } else {
                const ta = document.createElement('textarea');
                ta.value = shareText;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                done();
            }
        });
    }

    // DEEP DIVE 도트: 클릭 시 이메일 게이트 팝업 (이미 제출했으면 해당 섹션으로 이동)
    const deepDiveDot = document.getElementById('deep-dive-dot');
    if (deepDiveDot) {
        deepDiveDot.addEventListener('click', (e) => {
            if (localStorage.getItem('emailGateSubmitted')) return; // 기본 앵커 이동 (#step-9)
            e.preventDefault();
            openGate();
        });
    }

    // 팝업은 X 버튼으로만 닫힌다. 바깥(배경) 클릭·ESC로는 닫히지 않아
    // 실수로 사라지는 일이 없다.
    if (emailGateClose) emailGateClose.addEventListener('click', closeEmailGate);

    // Gate at the last step (Gender Gap)
    const stepLast = document.getElementById('step-9');

    const hasSubmitted = localStorage.getItem('emailGateSubmitted');

    // 닫기(X) 버튼도 동일하게 팝업만 숨긴다
    const gateCloseBtn = document.getElementById('gate-close');
    if (gateCloseBtn) gateCloseBtn.addEventListener('click', closeEmailGate);

    // 성별 장표는 블러가 새겨진 이미지라 항상 잠겨 있다.
    // 여기서는 리드 수집용 팝업만 띄운다(미제출 사용자 한정).
    // 팝업은 제출 전까지 계속 따라온다: X로 닫아도 섹션을 벗어났다가
    // 다시 돌아오면 다시 뜬다. 완전히 사라지는 건 제출 완료 시뿐이다.
    if (stepLast && !hasSubmitted) {
        let gateShown = false;
        const checkGate = () => {
            if (localStorage.getItem('emailGateSubmitted')) return;
            const r = stepLast.getBoundingClientRect();
            const inView = r.top < window.innerHeight * 0.65 && r.bottom > 0;
            if (inView) {
                if (!gateShown && !gateDismissed) {
                    gateShown = true;
                    openGate();
                }
            } else {
                // 섹션에서 벗어나면 재무장: 돌아오면 팝업이 다시 뜬다
                gateShown = false;
                gateDismissed = false;
            }
        };
        window.addEventListener('scroll', checkGate, { passive: true });
        window.addEventListener('resize', checkGate, { passive: true });
        // 앵커(#step-9)로 스크롤 이벤트 없이 바로 도착하는 경우도 판정
        setTimeout(checkGate, 300);
        setTimeout(checkGate, 1000);
    }

    if (emailGateForm) {
        emailGateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const company = document.getElementById('gate-company').value.trim();
            const name = document.getElementById('gate-name').value.trim();
            const position = document.getElementById('gate-position').value.trim();
            const email = document.getElementById('gate-email').value.trim();
            const phone = document.getElementById('gate-phone').value.trim();

            if (!company || !name || !position || !email || !phone) {
                gateMessage.textContent = '모든 항목을 입력해주세요.';
                gateMessage.className = 'gate-message error';
                return;
            }

            // 010으로 시작하는 11자리 휴대폰 번호만 허용
            const phoneDigits = phone.replace(/\D/g, '');
            if (!/^010\d{8}$/.test(phoneDigits)) {
                gateMessage.textContent = '모바일 번호를 정확히 입력해 주세요.';
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

            // 구글 시트로 데이터 전송 (엔드포인트는 파일 상단 GOOGLE_SCRIPT_URL 사용)
            gateMessage.textContent = '제출 중...';
            gateMessage.className = 'gate-message';

            const payload = new URLSearchParams(Object.assign({
                type: '리포트 요청',
                company: company,
                name: name,
                position: position,
                email: email,
                phone: phone,
                page: window.location.href
            }, getAttribution()));

            // 리포트 전문은 이메일로 발송한다. 화면의 성별 장표는 계속 잠긴 상태를 유지한다.
            const done = () => {
                gateMessage.textContent = '감사합니다! 입력하신 회사 이메일로 리포트 전문을 보내드릴게요.';
                gateMessage.className = 'gate-message success';
                localStorage.setItem('emailGateSubmitted', 'true');
                markGateDone();
                setTimeout(() => {
                    emailGateOverlay.classList.remove('active');
                }, 1500);
            };

            // 방문 로그와 동일하게 sendBeacon으로 보낸다. 브라우저가 전송을 넘겨받으므로
            // 응답을 기다리다 '제출 중'에 갇히지 않고, 페이지를 닫아도 전송이 완료된다.
            let queued = false;
            try { if (navigator.sendBeacon) queued = navigator.sendBeacon(GOOGLE_SCRIPT_URL, payload); } catch (e) {}
            if (queued) {
                done();
            } else {
                // sendBeacon을 쓸 수 없는 브라우저용 대체 경로 (5초 후에는 접수로 간주)
                const post = fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: payload.toString()
                }).catch(() => {});
                Promise.race([post, new Promise(resolve => setTimeout(resolve, 5000))]).then(done);
            }
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
