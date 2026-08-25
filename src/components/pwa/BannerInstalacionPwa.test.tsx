import { describe, expect, it } from "vitest";
import { BannerInstalacionPwa } from "./BannerInstalacionPwa";

describe("BannerInstalacionPwa Component", () => {
  it("se define y exporta correctamente", () => {
    expect(BannerInstalacionPwa).toBeDefined();
  });

  it("renderiza null cuando no hay un evento beforeinstallprompt activo", () => {
    const resultado = BannerInstalacionPwa();
    expect(resultado).toBeNull();
  });
});
