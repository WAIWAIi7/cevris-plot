# 配色 / Color palettes

28 presets: 20 categorical (four retained, sixteen new), four sequential and four diverging. Definitions live in shared/palettes.mjs. New palettes are original curated color selections; no competitor code, branding or palette assets are copied.

在编辑页选择“外观 → 全部配色”。分类图提供独立色块，数值强度提供连续渐变，相关性和逐行 Z 分数热图提供发散配色。环形热图沿用现有渲染器的色阶中心（Z 分数为零，原始值为中位数）。配色不会改变标准化、阈值、数据、字体、线宽、统计量和分组顺序。

Categorical presets now adapt to up to 100 active categories. Authored swatches are kept first; additional colors are deterministic variants chosen for separation within the palette's hue families. They do not cyclically repeat every 4, 7 or 8 groups. This does not imply that 100 colors are easy to distinguish: for many categories, retain labels or use facets. The palette picker previews the extension and reports the active count. Individual group colors remain editable. Volcano Down/Up use separate fixed roles, and Not significant remains neutral gray.

Sequential endpoints run light to dark with a monotonic relative-luminance progression. Diverging scales have a light neutral center and two chromatic endpoints. Three-stop scales use all stops; two-stop R scales use endpoints only. Preview swatches are an orientation aid; actual gradients and opacity are calculated by R. Categorical recoloring uses the existing fast SVG preview, then exact R synchronization. Continuous interpolated colors finish updating when R synchronization completes.

These design choices follow scientific-visualization Skill guidance on categorical/sequential/diverging semantics, restrained color and redundant encodings. They are not a claim of color-vision accessibility or journal certification. Check the actual final figure, including labels, contrast, transparency and grayscale use. Small pale marks may need a darker outline or larger size. The retained Misty blue preset is intentionally close in hue and benefits from position/labels.

## 类别改变时

- 不局限于四组。2、3、5、8、12、20、100 类均可自动配色，实际颜色写入项目与 R 导出。
- 已存在的类别按名称保留颜色；排序或删减显示类别不会让其他类别换色。增加类别时优先用当前配色的未使用颜色，不足时扩展。
- 类别改名按新类别处理，不推断两个名称是否代表同一生物学分组；可在外观面板单独设色。
- 分组柱状图按系列字段、分组堆叠图按组件字段着色，不按横轴位置编号。
- 导入新的数据集时保留同名类别及所选方案，清理上一数据集不再使用的颜色记录。组图同步按同名类别匹配，不按行号强行套色。
- `.figure.json`、`.composition.json`、保存的外观样式和 R 源码保留所选方案与实际色值。旧项目维持已有色值；旧版文件没有记录方案 ID 时，重新应用一次方案即可指定后续新增类别的配色依据。
- 类别很多时，“没有重复色号”不等于“人眼能可靠分辨”，超过 12 类会显示简短的标签/分面建议。热图等连续数值仍使用连续或发散色阶，不把每个数值当作类别。

## Agent usage

Run `node scripts/figure.mjs palettes` (also included in `catalog`). Set `"palette": "ocean-coral"` in a create/draw specification. Explicit `colors` and color parameters override the preset. Incompatible palette kinds or more than 100 categories fail clearly. Existing specifications work unchanged. Saved project files store the actual color values, so reopening or exporting requires no external palette service.

## Full list

| ID | Name | Kind | Colors |
| --- | --- | --- | --- |
| science | 科学灵感 / Scientific inspiration | categorical | #B5522A · #D9B382 · #8BA77E · #5B7EA6 · #3F6B4F · #D69CA0 · #2E2E33 |
| mist | 雾蓝层次 / Misty blue | categorical | #315F7D · #6389A3 · #98B2C6 · #B8CCD8 |
| nature | 自然生长 / Natural growth | categorical | #3F6B4F · #8BA77E · #D9B382 · #B5522A |
| balance | 冷暖对照 / Warm and cool | categorical | #5B7EA6 · #D69CA0 · #3F6B4F · #D9B382 |
| ocean-coral | 深海珊瑚 / Ocean & coral | categorical | #355C7D · #D57868 · #75A99C · #D8B36A · #8C7C9D · #729BB4 · #AB875F · #62666D |
| indigo-amber | 靛蓝琥珀 / Indigo & amber | categorical | #4C5F8A · #CE9E45 · #7BA48C · #B96C78 · #78AAB8 · #9D89B4 · #A98C70 · #5A626A |
| forest-clay | 森林陶土 / Forest & clay | categorical | #426B57 · #BE755D · #8DA384 · #D6B878 · #698D9E · #AB879E · #8F795C · #58605B |
| sea-rose | 海盐玫瑰 / Sea salt & rose | categorical | #4D8793 · #C88394 · #9DAE80 · #D5AC71 · #7B80AB · #82B4AA · #A78168 · #5B6571 |
| wisteria-olive | 紫藤橄榄 / Wisteria & olive | categorical | #82709F · #8E9D60 · #C78372 · #5E91A6 · #C5A064 · #A47B91 · #72A094 · #65616B |
| graphite-cherry | 石墨樱红 / Graphite & cherry | categorical | #4B5663 · #B85C72 · #6A9F98 · #CEA365 · #7F88AE · #B2927C · #8CA36F · #8F758F |
| lagoon-ochre | 湖蓝赭石 / Lagoon & ochre | categorical | #327C94 · #C48A4E · #7EAA8F · #BE7D8A · #8C81AC · #C6AE6F · #6C8B9E · #636A65 |
| navy-berry | 深海浆果 / Navy & berry | categorical | #3B567A · #A56789 · #69A293 · #D0A65D · #A98C6A · #8995B8 · #C78574 · #657466 |
| slate-apricot | 蓝灰杏黄 / Slate & apricot | categorical | #627F99 · #D6A06C · #87A28E · #BD8094 · #A6A263 · #8D83A3 · #62A6AD · #6F6761 |
| turquoise-plum | 松石梅紫 / Turquoise & plum | categorical | #3F9997 · #99658A · #CE9B60 · #7E90B6 · #9DA96D · #CB8178 · #7C9B84 · #5B626E |
| autumn-field | 秋日原野 / Autumn field | categorical | #A45E3F · #C49D50 · #7F9363 · #477C79 · #9281A4 · #C17F83 · #6F8DA4 · #6B6259 |
| herbarium | 植物标本 / Herbarium | categorical | #49735D · #9CAC77 · #B68B54 · #C38687 · #638B9A · #947AA1 · #A99478 · #60695F |
| nordic-coast | 北欧海岸 / Nordic coast | categorical | #456C88 · #79A6AD · #D3B17C · #BC7B70 · #8FA383 · #8D83A6 · #AA956C · #5D6673 |
| mineral | 矿物晶石 / Mineral collection | categorical | #477B87 · #9D779D · #BF9361 · #6C9B7E · #BD717F · #7C88B0 · #AAA16F · #62646F |
| dusk | 暮色花园 / Dusk garden | categorical | #6A698F · #C47E87 · #D4A76A · #689994 · #9AA478 · #8C91AC · #AA8268 · #606A71 |
| clear-contrast | 清晰对照 / Clear contrast | categorical | #276487 · #CE753C · #389185 · #A65D81 · #B49D3E · #786AA4 · #769E59 · #555D68 |
| seq-ocean | 海洋渐变 / Ocean depth | sequential | #EDF5F7 · #7CA9BD · #214C67 |
| seq-forest | 森林渐变 / Forest shade | sequential | #F0F5EA · #93B49A · #28563F |
| seq-plum | 梅紫渐变 / Plum shade | sequential | #F6EFF5 · #B09AB9 · #553B6B |
| seq-amber | 琥珀渐变 / Amber shade | sequential | #FBF4E7 · #D0A066 · #79502A |
| div-blue-rust | 蓝锈发散 / Blue & rust | diverging | #3E7195 · #F3F1EC · #B35D40 |
| div-teal-rose | 青玫发散 / Teal & rose | diverging | #287E7A · #F2F1ED · #AB5775 |
| div-plum-olive | 紫橄发散 / Plum & olive | diverging | #795687 · #F3F1ED · #738347 |
| div-indigo-gold | 靛金发散 / Indigo & gold | diverging | #4E6598 · #F4F1E9 · #AC7E2D |

## Review

`node scripts/review-palettes.mjs` produces actual R-rendered raincloud/heatmap examples, PNG, SVG and editable projects under verification/palettes. All 24 new schemes share fixed synthetic data within each chart kind. This review does not alter user projects or default examples.
