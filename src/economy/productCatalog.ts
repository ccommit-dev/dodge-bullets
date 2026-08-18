export type ProductKind = "consumable" | "bundle" | "entitlement";

export type StoreProduct = {
  id: string;
  kind: ProductKind;
  name: string;
  description: string;
  displayPrice: string;
  badge?: string;
  contents: string[];
  visible: boolean;
};

export const STORE_PRODUCTS: StoreProduct[] = [
  { id: "gems-80", kind: "consumable", name: "붉은 보석 80", description: "성장 선택권과 외형 구매에 사용", displayPrice: "₩1,500", contents: ["붉은 보석 ×80"], visible: true },
  { id: "gems-450", kind: "consumable", name: "붉은 보석 450", description: "보너스 50개 포함", displayPrice: "₩7,500", badge: "POPULAR", contents: ["붉은 보석 ×450"], visible: true },
  { id: "gems-1200", kind: "consumable", name: "붉은 보석 1,200", description: "보너스 200개 포함", displayPrice: "₩15,000", contents: ["붉은 보석 ×1,200"], visible: true },
  { id: "adventurer-starter", kind: "bundle", name: "초급 모험가 세트", description: "초반 성장 시간을 줄이는 입문 패키지", displayPrice: "₩3,900", badge: "1회", contents: ["보석 ×80", "강화석 ×10", "정찰 견갑", "골드 ×5,000"], visible: true },
  { id: "adventurer-mid", kind: "bundle", name: "중급 모험가 세트", description: "스킬과 견갑 성장을 위한 패키지", displayPrice: "₩12,000", contents: ["보석 ×250", "스킬 코어 ×5", "그림자 견갑 선택권", "골드 ×50,000"], visible: true },
  { id: "adventurer-advanced", kind: "bundle", name: "고급 모험가 세트", description: "후반 외형과 성장 선택권 패키지", displayPrice: "₩29,000", contents: ["보석 ×700", "스킬 코어 ×15", "용린 견갑 선택권", "한정 무기 외형"], visible: true },
  { id: "remove-ads", kind: "entitlement", name: "광고 제거", description: "광고 기능 도입 이후에만 판매", displayPrice: "준비 중", contents: ["보상형 광고 제외 일반 광고 제거"], visible: false },
];
