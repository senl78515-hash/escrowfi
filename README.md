# EscrowFi — Trustless USDC Escrow on Solana

> **PayFi 私密智能托管** | Solana Devnet | Anchor 0.32.1

[English](#english) | [中文](#中文)

---

## English

### What is EscrowFi?

EscrowFi is a decentralized escrow payment platform built on Solana. Buyers lock USDC into a smart-contract vault; funds are only released when the buyer confirms delivery — or settled by an arbitrator in case of disputes. All logic is on-chain, trustless, and non-custodial.

### Features

- **USDC Escrow** — Funds locked in a PDA vault, released only on confirmation
- **Dispute Resolution** — Raise a dispute; a chosen arbitrator resolves it in favor of buyer or seller
- **Privacy Mode** — Toggle to hide the escrow amount from the UI (Confidential Transfer placeholder)
- **Role-Aware UI** — Different action panels for buyer, seller, and arbitrator
- **i18n** — One-click English ↔ Chinese toggle
- **Devnet Ready** — Deploy and test on Solana Devnet with real wallets

### Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Rust · Anchor 0.32.1 |
| Token | SPL Token · USDC (Devnet) |
| Frontend | Next.js 15 · TypeScript · Tailwind CSS |
| Wallet | Phantom · Solflare (via wallet-adapter) |
| Client SDK | @coral-xyz/anchor ^0.32 |

### Contract Instructions

| Instruction | Description |
|---|---|
| `create_escrow` | Buyer creates escrow and deposits USDC into vault |
| `mark_delivered` | Seller marks goods/service as delivered |
| `confirm_receipt` | Buyer confirms receipt → releases funds to seller |
| `raise_dispute` | Buyer or seller raises a dispute |
| `resolve_dispute` | Arbitrator resolves dispute (to seller or buyer) |
| `cancel_escrow` | Buyer cancels before delivery |

### Escrow State Machine

```
Active ──mark_delivered──► Delivered ──confirm_receipt──► Completed
  │                             │
  │                         raise_dispute
  │                             │
  └──raise_dispute──────────► Disputed ──resolve_dispute──► Completed
  │
  └──cancel_escrow──────────► Cancelled
```

### Project Structure

```
EscrowFi/
├── programs/escrowfi/src/lib.rs   # Anchor smart contract
├── tests/escrowfi.ts               # Integration tests
├── Anchor.toml                     # Anchor config (Devnet)
└── app/
    ├── src/
    │   ├── app/                    # Next.js pages
    │   │   ├── page.tsx            # Landing
    │   │   ├── dashboard/          # Escrow list
    │   │   ├── create/             # New escrow form
    │   │   └── escrow/[id]/        # Escrow detail & actions
    │   ├── components/             # Navbar, EscrowCard, StatusBadge
    │   ├── contexts/               # WalletContextProvider
    │   ├── i18n/                   # EN/ZH translations
    │   ├── idl/                    # Anchor IDL (auto-generated)
    │   └── utils/                  # PDA helpers, constants
    └── package.json
```

### Quick Start

```bash
# 1. Build the contract (requires Anchor CLI 0.32.1 + Solana CLI)
anchor build
anchor keys list   # copy the program ID

# 2. Update Program ID in 4 places:
#    - programs/escrowfi/src/lib.rs  (declare_id!)
#    - Anchor.toml
#    - app/src/utils/constants.ts
#    - app/src/idl/escrowfi.ts

# 3. Deploy to Devnet
solana config set --url devnet
solana airdrop 2
anchor deploy

# 4. Run the frontend
cd app
npm install
npm run dev
# → http://localhost:3000
```

### Environment

- Solana Devnet
- USDC Mint (Devnet): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Default Arbitrator: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

---

## 中文

### EscrowFi 是什么？

EscrowFi 是一个基于 Solana 的去中心化托管支付平台。买家将 USDC 锁入智能合约的 PDA 资金库，只有买家确认收货后资金才会释放给卖家；发生争议时由仲裁员介入处理。全部逻辑在链上执行，无需信任第三方，非托管式设计。

### 核心特性

- **USDC 托管** — 资金锁入 PDA 金库，仅在确认收货时释放
- **争议仲裁** — 买卖双方均可发起争议，仲裁员决定资金归属
- **隐私模式** — 一键隐藏托管金额（Confidential Transfer 占位实现）
- **角色感知 UI** — 买家/卖家/仲裁员看到不同的操作面板
- **中英文切换** — 一键切换界面语言（English ↔ 中文）
- **Devnet 就绪** — 可直接在 Solana Devnet 上部署和测试

### 技术栈

| 层级 | 技术 |
|---|---|
| 智能合约 | Rust · Anchor 0.32.1 |
| 代币 | SPL Token · USDC（Devnet） |
| 前端 | Next.js 15 · TypeScript · Tailwind CSS |
| 钱包 | Phantom · Solflare（via wallet-adapter） |
| 客户端 SDK | @coral-xyz/anchor ^0.32 |

### 合约指令说明

| 指令 | 说明 |
|---|---|
| `create_escrow` | 买家创建托管单，将 USDC 存入金库 |
| `mark_delivered` | 卖家标记商品/服务已交付 |
| `confirm_receipt` | 买家确认收货 → 自动释放资金给卖家 |
| `raise_dispute` | 买家或卖家发起争议 |
| `resolve_dispute` | 仲裁员裁决（支持卖家或退款买家） |
| `cancel_escrow` | 买家在交付前取消并退款 |

### 托管状态流转

```
Active（活跃）──mark_delivered──► Delivered（已交付）──confirm_receipt──► Completed（已完成）
  │                                      │
  │                                  raise_dispute
  │                                      │
  └──raise_dispute──────────────► Disputed（争议中）──resolve_dispute──► Completed
  │
  └──cancel_escrow──────────────► Cancelled（已取消）
```

### 项目结构

```
EscrowFi/
├── programs/escrowfi/src/lib.rs   # Anchor 智能合约
├── tests/escrowfi.ts               # 集成测试
├── Anchor.toml                     # Anchor 配置（Devnet）
└── app/
    ├── src/
    │   ├── app/                    # Next.js 页面
    │   │   ├── page.tsx            # 首页
    │   │   ├── dashboard/          # 托管单列表
    │   │   ├── create/             # 创建托管单
    │   │   └── escrow/[id]/        # 托管详情与操作
    │   ├── components/             # Navbar、EscrowCard、StatusBadge
    │   ├── contexts/               # WalletContextProvider
    │   ├── i18n/                   # 中英文翻译
    │   ├── idl/                    # Anchor IDL（自动生成）
    │   └── utils/                  # PDA 工具函数、常量
    └── package.json
```

### 快速启动

```bash
# 1. 编译合约（需要 Anchor CLI 0.32.1 + Solana CLI）
anchor build
anchor keys list   # 复制程序 ID

# 2. 将程序 ID 更新到 4 个文件：
#    - programs/escrowfi/src/lib.rs  (declare_id!)
#    - Anchor.toml
#    - app/src/utils/constants.ts
#    - app/src/idl/escrowfi.ts

# 3. 部署到 Devnet
solana config set --url devnet
solana airdrop 2
anchor deploy

# 4. 启动前端
cd app
npm install
npm run dev
# → http://localhost:3000
```

### 环境信息

- 网络：Solana Devnet
- USDC Mint（Devnet）：`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- 默认仲裁员地址：`Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

### 黑客松说明

本项目参加 Solana 黑客松，核心展示：
1. **PayFi 场景** — 链上托管替代传统第三方支付担保
2. **SPL Token 集成** — USDC 原生转账，无需 wrapped 代币
3. **隐私扩展点** — 预留 Arcium MPC / Confidential Transfer 接入接口
4. **完整全栈** — 合约 + 前端一体化交付

---

*Built on Solana · Powered by Anchor · 为 Web3 支付而生*
